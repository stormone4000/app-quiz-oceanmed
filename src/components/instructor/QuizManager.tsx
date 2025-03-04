import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Book, GraduationCap, Users, Filter, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { QuizCreator } from './QuizCreator';
import { QuizList } from './QuizList';
import { AssignQuiz } from './AssignQuiz';
import { DeleteQuizModal } from './DeleteQuizModal';
import { QuizLive } from '../interactive/QuizLive';

// Definizione dell'interfaccia Quiz che include tutti i tipi di quiz
interface Quiz {
  id: string;
  title: string;
  description: string;
  quiz_type: 'exam' | 'learning' | 'interactive';
  category: string;
  question_count: number;
  duration_minutes: number;
  icon: string;
  icon_color: string;
  visibility?: string;
  created_by?: string;
  quiz_code?: string;
  activations_count?: number;
}

interface QuizManagerProps {
  mode?: 'all' | 'manage';
}

export function QuizManager({ mode = 'manage' }: QuizManagerProps) {
  const [activeTab, setActiveTab] = useState<'exam' | 'learning' | 'interactive'>('learning');
  const [showCreator, setShowCreator] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'my' | 'public' | 'private'>(
    mode === 'all' ? 'all' : 'my'
  );

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const email = localStorage.getItem('userEmail');
      if (!email) {
        throw new Error('Email utente non trovata nel localStorage');
      }

      // Ottieni l'ID dell'utente basato sull'email
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) {
        console.error('Errore nel recuperare l\'ID utente:', userError);
        throw userError;
      }

      const userId = userData.id;
      console.log('ID utente recuperato:', userId);

      let query = supabase
        .from('quiz_templates')
        .select(`
          *,
          questions:quiz_questions(
            id,
            question_text,
            options,
            correct_answer,
            explanation,
            image_url
          )
        `)
        .eq('quiz_type', activeTab)
        .order('created_at', { ascending: false });

      // Applicazione dei filtri in base al ruolo e alle preferenze
      if (isMaster) {
        // Admin può filtrare in vari modi
        if (filterMode === 'my') {
          query = query.eq('created_by', userId);
        } else if (filterMode === 'public') {
          query = query.eq('visibility', 'public');
        } else if (filterMode === 'private') {
          query = query.eq('visibility', 'private');
        }
        // Se filterMode === 'all', non applichiamo filtri aggiuntivi
      } else {
        // Gli istruttori vedono solo i propri quiz
        query = query.eq('created_by', userId);
      }

      const { data: quizzesData, error: quizzesError } = await query;

      if (quizzesError) {
        console.error('Errore nella query:', quizzesError);
        throw quizzesError;
      }
      
      console.log(`Quiz trovati: ${quizzesData?.length || 0}`);
      
      // Ottieni il conteggio delle attivazioni per ogni quiz
      const quizzesWithActivations = await Promise.all((quizzesData || []).map(async (quiz) => {
        if (quiz.quiz_code) {
          try {
            // Cerca nella tabella access_code_usage per contare gli studenti che hanno usato questo codice
            const { data: accessCodes, error: accessCodesError } = await supabase
              .from('access_codes')
              .select('id')
              .eq('code', quiz.quiz_code)
              .single();
              
            if (accessCodesError) {
              console.log(`Nessun codice di accesso trovato per il quiz_code: ${quiz.quiz_code}`);
              return {
                ...quiz,
                activations_count: 0
              };
            }
            
            // Conta gli utilizzi del codice
            const { count, error: countError } = await supabase
              .from('access_code_usage')
              .select('*', { count: 'exact', head: true })
              .eq('code_id', accessCodes.id);
              
            if (countError) {
              console.error('Errore nel conteggio utilizzi:', countError);
              return {
                ...quiz,
                activations_count: 0
              };
            }
            
            return {
              ...quiz,
              activations_count: count || 0
            };
          } catch (error) {
            console.error('Errore nel conteggio attivazioni:', error);
            return {
              ...quiz,
              activations_count: 0
            };
          }
        }
        
        return {
          ...quiz,
          activations_count: 0
        };
      }));
      
      setQuizzes(quizzesWithActivations);
    } catch (error) {
      console.error('Errore nel caricamento dei quiz:', error);
      setError('Errore durante il caricamento dei quiz');
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, isMaster, filterMode]);

  useEffect(() => {
    const checkMasterStatus = async () => {
      try {
        const email = localStorage.getItem('userEmail');
        if (!email) return;
        
        const isMasterValue = localStorage.getItem('isMaster') === 'true';
        console.log(`Stato admin master da localStorage: ${isMasterValue}`);
        setIsMaster(isMasterValue);
        
        // Verifica isMaster da Supabase
        const { data: userData, error: userError } = await supabase
          .from('auth_users')
          .select('is_master')
          .eq('email', email)
          .single();
          
        if (userError) {
          console.error('Errore verifica stato admin:', userError);
          return;
        }
        
        if (userData) {
          console.log(`Stato admin master da database: ${userData.is_master}`);
          setIsMaster(userData.is_master);
          localStorage.setItem('isMaster', userData.is_master ? 'true' : 'false');
        }
      } catch (error) {
        console.error('Errore verifica stato admin:', error);
      }
    };
    
    checkMasterStatus();
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const handleDeleteConfirm = async () => {
    if (!quizToDelete) return;

    try {
      setLoading(true);
      setError(null);

      const email = localStorage.getItem('userEmail');
      if (!email) {
        throw new Error('Email utente non trovata nel localStorage');
      }

      // Ottieni l'ID dell'utente basato sull'email
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError) {
        console.error('Errore nel recuperare l\'ID utente:', userError);
        throw userError;
      }

      const userId = userData.id;
      console.log('ID utente per la cancellazione:', userId);

      // Delete related questions first
      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizToDelete.id);

      if (questionsError) throw questionsError;

      const { error: quizError } = await supabase
        .from('quiz_templates')
        .delete()
        .eq('id', quizToDelete.id)
        .eq('created_by', userId); // Only delete own quizzes

      if (quizError) throw quizError;

      await loadQuizzes();
      setShowDeleteModal(false);
      setQuizToDelete(null);
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setError('Errore durante l\'eliminazione del quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    setSelectedQuiz(null);
    setShowCreator(true);
  };

  const handleVisibilityChange = async (quizId: string, isPublic: boolean) => {
    try {
      setError(null);
      
      const { error: updateError } = await supabase
        .from('quiz_templates')
        .update({ visibility: isPublic ? 'public' : 'private' })
        .eq('id', quizId);
        
      if (updateError) throw updateError;
      
      await loadQuizzes();
    } catch (error) {
      console.error('Error updating quiz visibility:', error);
      setError('Errore durante l\'aggiornamento della visibilità');
    }
  };

  const handleRegenerateCode = async (quizId: string) => {
    try {
      setError(null);

      const { error: regenerateError } = await supabase
        .rpc('regenerate_quiz_code', { quiz_id: quizId });

      if (regenerateError) throw regenerateError;

      await loadQuizzes();
    } catch (error) {
      console.error('Error regenerating quiz code:', error);
      setError('Errore durante la rigenerazione del codice');
    }
  };

  // Renderer per i controlli di filtro
  const renderFilterControls = () => {
    if (!isMaster) return null;
    
    return (
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-400">Filtro:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            Tutti
          </button>
          <button
            onClick={() => setFilterMode('my')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filterMode === 'my'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            Miei
          </button>
          <button
            onClick={() => setFilterMode('public')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              filterMode === 'public'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            <Eye className="w-3 h-3" />
            Pubblici
          </button>
          <button
            onClick={() => setFilterMode('private')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              filterMode === 'private'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            <EyeOff className="w-3 h-3" />
            Privati
          </button>
        </div>
      </div>
    );
  };

  // Funzione per testare un quiz
  const handleTestQuiz = (quiz: Quiz) => {
    // Implementazione per testare un quiz senza influenzare le statistiche
    // Questo potrebbe navigare a un percorso speciale o impostare un flag nella sessione
    const testMode = true;
    const quizId = quiz.id;
    const quizType = quiz.quiz_type;
    
    // Qui potremmo navigare a una route di test specifica
    // oppure salvare le informazioni nella sessionStorage e poi navigare
    sessionStorage.setItem('testMode', 'true');
    sessionStorage.setItem('testQuizId', quizId);
    
    // Utilizzo window.open per aprire in una nuova tab
    window.open(`/test-quiz/${quizType}/${quizId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">
          {mode === 'all' 
            ? 'Tutti i Quiz Disponibili' 
            : (isMaster ? 'Gestione Quiz Globale' : 'Gestione Quiz')}
        </h1>
        
        {mode === 'manage' && (
          <button
            onClick={handleCreateQuiz}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            <span>Crea Nuovo Quiz</span>
          </button>
        )}
      </div>
      
      {renderFilterControls()}

      <div className="flex justify-between border-b border-gray-200 dark:border-slate-700 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'learning' 
              ? 'border-b-2 border-blue-500 text-blue-500 dark:text-blue-400' 
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('learning')}
        >
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5" />
            <span>Moduli di Apprendimento</span>
          </div>
        </button>
        
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'exam' 
              ? 'border-b-2 border-blue-500 text-blue-500 dark:text-blue-400' 
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('exam')}
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <span>Quiz di Esame</span>
          </div>
        </button>
        
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'interactive' 
              ? 'border-b-2 border-blue-500 text-blue-500 dark:text-blue-400' 
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('interactive')}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>Quiz Interattivi</span>
          </div>
        </button>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
          <p className="text-gray-500 dark:text-slate-400">
            Nessun quiz trovato. {mode === 'manage' ? 'Crea il tuo primo quiz!' : 'Cambia i filtri per trovare dei quiz.'}
          </p>
        </div>
      ) : (
        <QuizList
          quizzes={quizzes}
          onEdit={mode === 'manage' ? (quiz) => {
            setSelectedQuiz(quiz);
            setShowCreator(true);
          } : undefined}
          onDelete={mode === 'manage' ? (quiz) => {
            setQuizToDelete(quiz);
            setShowDeleteModal(true);
          } : undefined}
          onAssign={mode === 'manage' ? (quiz) => {
            setSelectedQuiz(quiz);
            setShowAssignModal(true);
          } : undefined}
          onVisibilityChange={handleVisibilityChange}
          onRegenerateCode={handleRegenerateCode}
          onTestQuiz={mode === 'all' ? handleTestQuiz : undefined}
          isMaster={isMaster}
          viewMode={mode}
        />
      )}

      {showCreator && (
        <QuizCreator
          quizType={activeTab}
          editQuiz={selectedQuiz ?? undefined}
          onClose={() => setShowCreator(false)}
          onSaveSuccess={loadQuizzes}
        />
      )}

      {showAssignModal && selectedQuiz && (
        <AssignQuiz
          quiz={selectedQuiz}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedQuiz(null);
          }}
          onAssignSuccess={loadQuizzes}
        />
      )}

      {showDeleteModal && quizToDelete && (
        <DeleteQuizModal
          quiz={quizToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteModal(false);
            setQuizToDelete(null);
          }}
          isLoading={loading}
        />
      )}
    </div>
  );
}
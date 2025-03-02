import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Book, GraduationCap, Users } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { QuizCreator } from './QuizCreator';
import { QuizList } from './QuizList';
import { AssignQuiz } from './AssignQuiz';
import { DeleteQuizModal } from './DeleteQuizModal';
import type { QuizType, LiveQuizSession } from '../../types';
import { QuizLive } from '../interactive/QuizLive';

// Definizione dell'interfaccia Quiz che include tutti i tipi di quiz
interface Quiz {
  id: string;
  title: string;
  description: string;
  quiz_type: QuizType;
  category: string;
  question_count: number;
  duration_minutes: number;
  icon: string;
  icon_color: string;
  visibility: string;
  created_by: string;
  quiz_code?: string;
}

export function QuizManager() {
  const [activeTab, setActiveTab] = useState<QuizType>('learning');
  const [showCreator, setShowCreator] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is master admin and get email
    const checkMasterStatus = async () => {
      try {
        const email = localStorage.getItem('userEmail');
        setUserEmail(email);
        setIsMaster(localStorage.getItem('isMasterAdmin') === 'true');
      } catch (error) {
        console.error('Error checking master status:', error);
      }
    };

    checkMasterStatus();
    loadQuizzes();
  }, []);

  useEffect(() => {
    loadQuizzes();
  }, [activeTab]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsCreating(false);
      
      const email = localStorage.getItem('userEmail');
      if (!email) {
        throw new Error('Sessione utente non valida');
      }

      console.log(`Caricamento quiz di tipo: ${activeTab}, email: ${email}, isMaster: ${isMaster}`);

      // Build query based on user role
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

      console.log(`Esecuzione query per ${activeTab} quiz`);

      // Se non è un admin master, mostra i quiz creati dall'utente o quelli pubblici
      if (!isMaster) {
        query = query.or(`created_by.eq.${email},visibility.eq.public`);
        console.log(`Filtro query per non-master: OR(created_by.eq.${email},visibility.eq.public)`);
      }

      const { data: quizzesData, error: quizzesError } = await query;

      if (quizzesError) {
        console.error('Errore nella query:', quizzesError);
        throw quizzesError;
      }
      
      console.log(`Quiz trovati: ${quizzesData?.length || 0}`);
      console.log('Quiz data:', quizzesData);
      
      setQuizzes(quizzesData || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      setError('Errore durante il caricamento dei quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = (quiz: Quiz) => {
    setQuizToDelete(quiz);
    setShowDeleteModal(true);
  };

  const confirmDeleteQuiz = async () => {
    if (!quizToDelete) return;

    try {
      setLoading(true);
      setError(null);

      const email = localStorage.getItem('userEmail');
      if (!email) {
        throw new Error('Sessione utente non valida');
      }

      // First, complete any active sessions for this quiz
      const { data: activeSessions, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select('*')
        .eq('quiz_id', quizToDelete.id);

      if (sessionError) throw sessionError;

      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizToDelete.id);

      if (questionsError) throw questionsError;

      const { error: quizError } = await supabase
        .from('quiz_templates')
        .delete()
        .eq('id', quizToDelete.id)
        .eq('created_by', email); // Only delete own quizzes

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
    setIsCreating(true);
  };

  const handleVisibilityChange = async (quizId: string, isPublic: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('quiz_templates')
        .update({ visibility: isPublic ? 'public' : 'private' })
        .eq('id', quizId);

      if (updateError) throw updateError;
      await loadQuizzes();
    } catch (error) {
      console.error('Error updating quiz visibility:', error);
      setError('Errore durante l\'aggiornamento della visibilità del quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = async (quizId: string) => {
    try {
      setRegeneratingCode(quizId);
      setError(null);

      const { data: result, error: regenerateError } = await supabase
        .rpc('regenerate_quiz_code', { quiz_id: quizId });

      if (regenerateError) throw regenerateError;

      await loadQuizzes();
    } catch (error) {
      console.error('Error regenerating quiz code:', error);
      setError('Errore durante la rigenerazione del codice');
    } finally {
      setRegeneratingCode(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Gestione Quiz</h1>
        <button
          onClick={handleCreateQuiz}
          className="w-full sm:w-auto bg-white text-blue-600 px-6 py-3 rounded-lg shadow-md hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Crea Nuovo Quiz
        </button>
      </div>

      <div className="bg-blue-900 dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200 dark:border-slate-800 overflow-x-auto">
          <nav className="flex whitespace-nowrap min-w-full">
            <button
              onClick={() => setActiveTab('exam')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'exam'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <GraduationCap className="w-5 h-5" />
              <span className="whitespace-nowrap text-sm font-semibold text-blue-300 dark:text-blue-300">Quiz di Esame</span>
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'learning'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Book className="w-5 h-5" />
              <span className="whitespace-nowrap text-sm font-semibold text-blue-300 dark:text-blue-300">Moduli di Apprendimento</span>
            </button>
            <button
              onClick={() => setActiveTab('interactive')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 ${
                activeTab === 'interactive'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="whitespace-nowrap text-sm font-semibold text-blue-300 dark:text-blue-300">Quiz Interattivi</span>
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-6 dark:bg-slate-900">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-slate-400">Caricamento quiz in corso...</p>
            </div>
          ) : activeTab === 'interactive' ? (
            <QuizLive hostEmail={userEmail || ''} />
          ) : quizzes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-slate-400">
                Nessun quiz {activeTab === 'exam' ? 'di esame' : activeTab === 'learning' ? 'di apprendimento' : 'interattivo'} creato.
                Clicca su "Crea Nuovo Quiz" per iniziare.
              </p>
            </div>
          ) : (
            <QuizList
              quizzes={quizzes}
              quizType={activeTab as 'exam' | 'learning'}
              onEdit={(quiz) => {
                // Only allow editing if master admin or quiz creator
                if (!isMaster && quiz.created_by !== userEmail) {
                  setError('Non hai i permessi per modificare questo quiz');
                  return;
                }
                setSelectedQuiz(quiz);
                setShowCreator(true);
              }}
              onDelete={handleDeleteQuiz}
              onAssign={(quiz) => {
                // Only allow assigning if master admin or quiz creator
                if (!isMaster && quiz.created_by !== userEmail) {
                  setError('Non hai i permessi per assegnare questo quiz');
                  return;
                }
                setSelectedQuiz(quiz);
                setShowAssignModal(true);
              }}
              onRegenerateCode={handleRegenerateCode}
              onVisibilityChange={handleVisibilityChange}
              isMaster={isMaster}
            />
          )}
        </div>
      </div>

      {showCreator && (
        <QuizCreator
          quizType={activeTab}
          editQuiz={selectedQuiz}
          onClose={() => {
            setShowCreator(false);
            setSelectedQuiz(null);
          }}
          onSaveSuccess={() => {
            console.log('Quiz salvato con successo, ricarico la lista');
            loadQuizzes();
          }}
        />
      )}

      {showAssignModal && selectedQuiz && (
        <AssignQuiz
          quiz={selectedQuiz}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedQuiz(null);
          }}
        />
      )}

      {showDeleteModal && quizToDelete && (
        <DeleteQuizModal
          quiz={quizToDelete}
          onConfirm={confirmDeleteQuiz}
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
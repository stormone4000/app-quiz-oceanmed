import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Book, GraduationCap, Users, Filter, Eye, EyeOff, Globe, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Lock, Code } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { QuizCreator } from './QuizCreator';
import { QuizList } from './QuizList';
import { AssignQuiz } from './AssignQuiz';
import { DeleteQuizModal } from './DeleteQuizModal';
import { QuizLive } from '../interactive/QuizLive';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useModal } from '../../hooks/useModal';
import ActivateQuizCode from './ActivateQuizCode';

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
  created_at?: string;
}

interface QuizManagerProps {
  mode?: 'all' | 'manage';
}

export function QuizManager({ mode = 'manage' }: QuizManagerProps) {
  const [activeTab, setActiveTab] = useState<'exam' | 'learning' | 'interactive'>('learning');
  const [showCreator, setShowCreator] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
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
  
  // Nuovi stati per i filtri avanzati
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [instructorFilter, setInstructorFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableInstructors, setAvailableInstructors] = useState<{id: string, email: string}[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Aggiungiamo il hook per le modali
  const { modalState, closeModal, showSuccess, showError, showInfo } = useModal();

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const email = localStorage.getItem('userEmail');
      const userId = localStorage.getItem('userId');
      
      if (!email) {
        throw new Error('Email utente non trovata nel localStorage');
      }

      // Utilizziamo direttamente l'email dell'utente per filtrare i quiz
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
          // Cerca i quiz creati dall'utente corrente (sia per email che per UUID)
          query = userId 
            ? query.or(`created_by.eq.${email},created_by.eq.${userId}`) 
            : query.eq('created_by', email);
        } else if (filterMode === 'public') {
          query = query.eq('visibility', 'public');
        } else if (filterMode === 'private') {
          query = query.eq('visibility', 'private');
        }
        // Se filterMode === 'all', non applichiamo filtri aggiuntivi
      } else {
        if (mode === 'manage') {
          // Gli istruttori vedono solo i propri quiz nella modalità gestione (sia per email che per UUID)
          query = userId 
            ? query.or(`created_by.eq.${email},created_by.eq.${userId}`) 
            : query.eq('created_by', email);
        } else if (mode === 'all') {
          // In modalità "all", gli istruttori vedono SOLO i quiz pubblici DELL'ADMIN e i propri quiz
          
          // Costruiamo la query in modo più semplice e chiaro
          // Prima filtriamo per i quiz dell'istruttore
          if (userId) {
            query = query.or(`created_by.eq.${email},created_by.eq.${userId}`);
          } else {
            query = query.or(`created_by.eq.${email}`);
          }
          
          // Poi aggiungiamo i quiz pubblici dell'admin
          query = query.or(`visibility.eq.public,created_by.eq.marcosrenatobruno@gmail.com`);
        }
      }

      let quizzesData;
      let quizzesError;
      
      try {
        const result = await query;
        quizzesData = result.data;
        quizzesError = result.error;
      } catch (fetchError) {
        console.error('Errore di connessione durante il caricamento dei quiz:', fetchError);
        setError('Errore di connessione al server. Riprova più tardi.');
        setLoading(false);
        return;
      }

      if (quizzesError) {
        console.error('Errore nella query:', quizzesError);
        setError(`Errore nel caricamento dei quiz: ${quizzesError.message}`);
        setLoading(false);
        return;
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
  }, [activeTab, isMaster, filterMode, mode]);

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

      // Elimina il quiz senza verificare se l'utente è il creatore
      // Questo permette a qualsiasi utente di eliminare qualsiasi quiz
      const { error: quizError } = await supabase
        .from('quiz_templates')
        .delete()
        .eq('id', quizToDelete.id);

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
      
      // Verifica che l'utente corrente sia l'admin o il creatore del quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_templates')
        .select('created_by')
        .eq('id', quizId)
        .single();
      
      if (quizError) {
        console.error('Errore nel recupero delle informazioni sul quiz:', quizError);
        setError('Errore nel recupero delle informazioni sul quiz');
        return;
      }
      
      const userEmail = localStorage.getItem('userEmail');
      const userId = localStorage.getItem('userId');
      
      // Verifica se l'utente è autorizzato a modificare il quiz
      const isAuthorized = 
        isMaster || 
        quizData.created_by === userEmail || 
        (userId && quizData.created_by === userId);
      
      if (!isAuthorized) {
        console.error('Utente non autorizzato a modificare la visibilità del quiz');
        setError('Non sei autorizzato a modificare la visibilità di questo quiz');
        return;
      }
      
      // Determina la tabella corretta in base al tipo di quiz
      const tableName = activeTab === 'interactive' ? 'interactive_quiz_templates' : 'quiz_templates';
      
      try {
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ visibility: isPublic ? 'public' : 'private' })
          .eq('id', quizId);
          
        if (updateError) {
          console.error(`Errore nell'aggiornamento della visibilità del quiz:`, updateError);
          setError(`Errore nell'aggiornamento della visibilità: ${updateError.message}`);
          return;
        }
      } catch (fetchError) {
        console.error('Errore di connessione durante l\'aggiornamento della visibilità:', fetchError);
        setError('Errore di connessione al server. Riprova più tardi.');
        return;
      }
      
      // Aggiorna la lista dei quiz solo se l'operazione è andata a buon fine
      await loadQuizzes();
    } catch (error) {
      console.error('Errore durante la modifica della visibilità:', error);
      setError('Si è verificato un errore durante la modifica della visibilità del quiz');
    }
  };

  const handleRegenerateCode = async (quizId: string) => {
    try {
      setError(null);

      // Generiamo un codice casuale lato client invece di usare la funzione RPC
      const generateRandomCode = () => {
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Esclusi caratteri ambigui come I, O, 0, 1
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };
      
      // Genera un nuovo codice con prefisso QUIZ-
      const newCode = `QUIZ-${generateRandomCode()}`;
      
      // Aggiorniamo il quiz con il nuovo codice
      const { error: updateError } = await supabase
        .from('quiz_templates')
        .update({ quiz_code: newCode })
        .eq('id', quizId);
        
      if (updateError) throw updateError;

      // Ricarica i quiz per mostrare il nuovo codice
      await loadQuizzes();
      
      // Mostra un messaggio di successo con la modale personalizzata invece di alert
      showSuccess('Codice Generato', `Codice quiz rigenerato con successo: ${newCode}`);
      
    } catch (error) {
      console.error('Error regenerating quiz code:', error);
      setError('Errore durante la rigenerazione del codice');
      showError('Errore', 'Si è verificato un errore durante la rigenerazione del codice quiz.');
    }
  };

  // Funzione per caricare le categorie disponibili
  const loadCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_templates')
        .select('category')
        .not('category', 'is', null);
      
      if (error) throw error;
      
      if (data) {
        const categories = data
          .map(item => item.category)
          .filter((value, index, self) => value && self.indexOf(value) === index)
          .sort();
        
        setAvailableCategories(categories);
      }
    } catch (error) {
      console.error('Errore nel caricamento delle categorie:', error);
    }
  }, []);
  
  // Funzione per caricare gli istruttori disponibili
  const loadInstructors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_templates')
        .select('created_by')
        .not('created_by', 'is', null);
      
      if (error) throw error;
      
      if (data) {
        const instructorEmails = data
          .map(item => item.created_by)
          .filter((value, index, self) => value && self.indexOf(value) === index);
        
        // Ottieni i dettagli degli istruttori
        const instructors = instructorEmails.map(email => ({
          id: email,
          email: email
        }));
        
        setAvailableInstructors(instructors);
      }
    } catch (error) {
      console.error('Errore nel caricamento degli istruttori:', error);
    }
  }, []);
  
  // Funzione per applicare i filtri avanzati
  const applyAdvancedFilters = useCallback(() => {
    let result = [...quizzes];
    
    // Filtro per testo di ricerca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(quiz => 
        quiz.title.toLowerCase().includes(query) || 
        (quiz.description && quiz.description.toLowerCase().includes(query))
      );
    }
    
    // Filtro per categoria
    if (categoryFilter) {
      result = result.filter(quiz => quiz.category === categoryFilter);
    }
    
    // Filtro per istruttore
    if (instructorFilter) {
      result = result.filter(quiz => quiz.created_by === instructorFilter);
    }
    
    // Filtro per data
    if (dateFilter !== 'all') {
      const now = new Date();
      let dateLimit: Date;
      
      switch (dateFilter) {
        case 'today':
          dateLimit = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          dateLimit = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          dateLimit = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          dateLimit = new Date(0); // 1970-01-01
      }
      
      result = result.filter(quiz => {
        if (!quiz.created_at) return false;
        const quizDate = new Date(quiz.created_at);
        return quizDate >= dateLimit;
      });
    }
    
    setFilteredQuizzes(result);
    setCurrentPage(1); // Reset alla prima pagina quando si applicano i filtri
  }, [quizzes, searchQuery, categoryFilter, instructorFilter, dateFilter]);
  
  // Applica i filtri quando cambiano i parametri
  useEffect(() => {
    applyAdvancedFilters();
  }, [applyAdvancedFilters, quizzes, searchQuery, categoryFilter, instructorFilter, dateFilter]);
  
  // Carica categorie e istruttori all'avvio
  useEffect(() => {
    if (quizzes.length > 0) {
      loadCategories();
      loadInstructors();
    }
  }, [quizzes, loadCategories, loadInstructors]);
  
  // Calcola i quiz da visualizzare nella pagina corrente
  const paginatedQuizzes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuizzes.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuizzes, currentPage]);
  
  // Calcola il numero totale di pagine
  const totalPages = useMemo(() => 
    Math.ceil(filteredQuizzes.length / itemsPerPage),
    [filteredQuizzes]
  );

  // Renderer per i controlli di filtro
  const renderFilterControls = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-3">Filtri</h2>
          <div className="mb-6">
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
                  <Globe className="w-3.5 h-3.5" />
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
                  <Lock className="w-3.5 h-3.5" />
                  Privati
                </button>
              </div>
              
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="ml-auto px-3 py-1 rounded-md text-sm font-medium transition-colors bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600 flex items-center gap-1"
              >
                {showAdvancedFilters ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Nascondi filtri avanzati
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Mostra filtri avanzati
                  </>
                )}
              </button>
            </div>
            
            {showAdvancedFilters && (
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ricerca testuale */}
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ricerca
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      id="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cerca per titolo o descrizione"
                      className="pl-10 w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Filtro per categoria */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoria
                  </label>
                  <select
                    id="category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tutte le categorie</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro per istruttore */}
                <div>
                  <label htmlFor="instructor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Istruttore
                  </label>
                  <select
                    id="instructor"
                    value={instructorFilter}
                    onChange={(e) => setInstructorFilter(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tutti gli istruttori</option>
                    {availableInstructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.email}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Filtro per data */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data di creazione
                  </label>
                  <select
                    id="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
                    className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 py-2 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Qualsiasi data</option>
                    <option value="today">Oggi</option>
                    <option value="week">Ultima settimana</option>
                    <option value="month">Ultimo mese</option>
                  </select>
                </div>
                
                {/* Pulsanti di reset e applicazione filtri */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('');
                      setInstructorFilter('');
                      setDateFilter('all');
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
                  >
                    Reimposta filtri
                  </button>
                </div>
              </div>
            )}
            
            {/* Mostra il conteggio dei risultati e la paginazione */}
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              <div>
                Mostrando {filteredQuizzes.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                {Math.min(currentPage * itemsPerPage, filteredQuizzes.length)} di {filteredQuizzes.length} quiz
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <span>
                    Pagina {currentPage} di {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
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
    <div className="container mx-auto px-4 py-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {mode === 'all' ? 'Esplora Quiz' : 'Gestione Quiz'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {mode === 'all' 
              ? 'Esplora e prova i quiz disponibili' 
              : 'Crea, modifica e gestisci i tuoi quiz'}
          </p>
        </div>
      </div>
      
      {/* Sezione dei pulsanti di azione */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Card per aggiungere quiz tramite codice - Sostituito con ActivateQuizCode */}
        <ActivateQuizCode onQuizActivated={loadQuizzes} />
        
        {/* Card per creare nuovo quiz */}
        <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-300">Crea Nuovo Quiz</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Crea un nuovo quiz da zero definendo domande, risposte e impostazioni. 
            I quiz che crei saranno disponibili nella tua collezione personale.
          </p>
          <button
            onClick={handleCreateQuiz}
            className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-3 rounded-md flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Crea Nuovo Quiz</span>
          </button>
        </div>
      </div>

      {/* Tabs di navigazione */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('learning')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'learning'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              <span>Moduli di Apprendimento</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('exam')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'exam'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              <span>Quiz di Esame</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('interactive')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'interactive'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>Quiz Interattivi</span>
            </div>
          </button>
        </div>
      </div>

      {renderFilterControls()}

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
          quizzes={paginatedQuizzes}
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

      {/* Aggiungiamo la modale personalizzata */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
      />
    </div>
  );
}
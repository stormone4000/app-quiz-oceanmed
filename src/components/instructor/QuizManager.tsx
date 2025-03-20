import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Book, GraduationCap, Users, Filter, Eye, EyeOff, Globe, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Lock, Code, PlusCircle, InfoIcon, AlertCircle, BookOpen, Layers, RefreshCw } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../services/supabase';
import { QuizCreator } from './QuizCreator';
import { QuizList } from './QuizList';
import { AssignQuiz } from './AssignQuiz';
import { DeleteQuizModal } from './DeleteQuizModal';
import { QuizLive } from '../interactive/QuizLive';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useModal } from '../../hooks/useModal';
import ActivateQuizCode from './ActivateQuizCode';
import toast from 'react-hot-toast';

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
  questions?: Array<{
    id?: string;
    question_text: string;
    options: string[];
    correct_answer: number;
    explanation?: string;
    image_url?: string;
  }>;
}

interface QuizManagerProps {
  mode?: 'all' | 'manage';
  quizType?: 'exam' | 'learning' | 'interactive';
  selectedCategory?: string | null;
  userEmail?: string; // Email dell'utente da usare come preferenza
}

export function QuizManager({ mode = 'manage', quizType, selectedCategory, userEmail: propUserEmail }: QuizManagerProps) {
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
  const [userEmail, setUserEmail] = useState<string | null>(propUserEmail || null);
  const [filterMode, setFilterMode] = useState<'all' | 'my' | 'public' | 'private'>(
    mode === 'all' ? 'all' : 'my'
  );
  
  // Verifica lo stato dell'utente all'avvio del componente
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
  
  // Log per verificare lo stato iniziale
  useEffect(() => {
    console.log('==================== STATO INIZIALE ====================');
    console.log('Modalità:', mode);
    console.log('Filtro:', filterMode);
    console.log('Quiz:', quizzes.length);
    console.log('Quiz filtrati:', filteredQuizzes.length);
    console.log('==================== FINE STATO INIZIALE ====================');
  }, [mode, filterMode, quizzes, filteredQuizzes]);
  
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
  
  // Inizializza userEmail dal localStorage o dalle props
  useEffect(() => {
    // Se abbiamo ricevuto l'email dalle props, usiamo quella come priorità
    if (propUserEmail) {
      console.log('Email utente ricevuta dalle props:', propUserEmail);
      setUserEmail(propUserEmail);
      // Assicuriamoci che sia sincronizzata con localStorage
      if (localStorage.getItem('userEmail') !== propUserEmail) {
        localStorage.setItem('userEmail', propUserEmail);
      }
      return;
    }
    
    // Altrimenti cerchiamo in diverse fonti
    const retrieveUserEmail = () => {
      // Tenta prima dal localStorage
      const emailFromStorage = localStorage.getItem('userEmail');
      
      // Se c'è già un userEmail nello stato, rispettiamolo
      if (userEmail) {
        console.log('Email già presente nello stato:', userEmail);
        return;
      }
      
      // Se abbiamo trovato l'email nel localStorage
      if (emailFromStorage) {
        console.log('Email utente caricata dal localStorage:', emailFromStorage);
        setUserEmail(emailFromStorage);
        return;
      }
      
      // Tenta di recuperare da sessionStorage
      const emailFromSession = sessionStorage.getItem('userEmail');
      if (emailFromSession) {
        console.log('Email utente caricata da sessionStorage:', emailFromSession);
        setUserEmail(emailFromSession);
        // Sincronizziamo con localStorage per futuri utilizzi
        localStorage.setItem('userEmail', emailFromSession);
        return;
      }
      
      // Tenta di recuperarla dall'URL (se presente nei parametri)
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('email');
      if (emailFromUrl) {
        console.log('Email utente recuperata dai parametri URL:', emailFromUrl);
        setUserEmail(emailFromUrl);
        // Salviamo anche in localStorage per futuri utilizzi
        localStorage.setItem('userEmail', emailFromUrl);
        return;
      }
      
      // Rimuovi questo dopo il debug
      console.log('DEBUG - Contenuto localStorage:', {
        userEmail: localStorage.getItem('userEmail'),
        authToken: localStorage.getItem('authToken') ? 'presente' : 'assente',
        userId: localStorage.getItem('userId'),
        allKeys: Object.keys(localStorage)
      });
      
      console.warn('⚠️ Impossibile trovare l\'email utente in nessuna fonte disponibile');
    };
    
    retrieveUserEmail();
  }, [userEmail, propUserEmail]); // Aggiungiamo propUserEmail come dipendenza
  
  // Aggiungi listener per i cambiamenti nel localStorage
  useEffect(() => {
    // Funzione per gestire gli aggiornamenti del localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userEmail' && e.newValue) {
        console.log('Email utente aggiornata in localStorage:', e.newValue);
        setUserEmail(e.newValue);
      }
    };
    
    // Aggiungi listener per i cambiamenti nel localStorage
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Aggiungiamo il hook per le modali
  const { modalState, closeModal, showSuccess, showError, showInfo } = useModal();

  const loadQuizzes = useCallback(async () => {
    try {
      console.log('==================== INIZIO CARICAMENTO QUIZ ====================');
      console.log('Email utente:', userEmail);
      console.log('Modalità:', mode);
      console.log('Filtro:', filterMode);
      console.log('Tipo quiz:', activeTab);
      
      // Riprova a ottenere l'email se non presente
      if (!userEmail) {
        // Tenta un recupero di emergenza dal localStorage
        const emergencyEmail = localStorage.getItem('userEmail');
        
        if (emergencyEmail) {
          console.log('Email recuperata in emergenza dal localStorage:', emergencyEmail);
          setUserEmail(emergencyEmail);
          // Continua con l'email recuperata
        } else {
          // Se ancora non disponibile, mostra un messaggio di errore appropriato
          const errMsg = 'Email utente non trovata. Ricarica la pagina o effettua nuovamente il login.';
          console.error(errMsg);
          setError(errMsg);
          setLoading(false);
          return;
        }
      }

      // QUERY SEMPLIFICATA: poiché le RLS sono disattivate, usiamo una query diretta
      try {
        let query = supabaseAdmin
          .from('quiz_templates')
          .select('*')
          .eq('quiz_type', activeTab);
          
        // Filtriamo in base alla modalità e al filtro
        if (mode === 'manage') {
          // In modalità gestione, mostriamo solo i quiz dell'utente
          query = query.eq('created_by', userEmail);
        } else if (mode === 'all') {
          // In modalità "Quiz Disponibili", applichiamo il filtro selezionato
          if (filterMode === 'my') {
            query = query.eq('created_by', userEmail);
          } else if (filterMode === 'public') {
            query = query.eq('visibility', 'public');
          } else if (filterMode === 'private') {
            // Assicuriamoci di mostrare SOLO i quiz privati dell'utente
            // e non quelli pubblici o di altri utenti
            
            // Prima resettiamo i quiz per evitare mescolamenti
            setQuizzes([]);
            setFilteredQuizzes([]);
            
            // Costruiamo una query più esplicita per i privati
            query = query
              .eq('created_by', userEmail)
              .eq('visibility', 'private');
            
            // Loghiamo in modo più chiaro per debugging
            console.log('Query filtro PRIVATI:', 
              `SELECT * FROM quiz_templates WHERE quiz_type = '${activeTab}' AND created_by = '${userEmail}' AND visibility = 'private'`);
            console.log('Filtro attivo:', filterMode);
          } else {
            // filterMode === 'all', mostriamo tutti i quiz dell'utente + quelli pubblici
            query = query.or(`created_by.eq.${userEmail},visibility.eq.public`);
          }
        }
        
        // Ordiniamo i quiz
        query = query.order('created_at', { ascending: false });
        
        console.log('Esecuzione query...');
        
        // Eseguiamo la query
        const { data: quizData, error } = await query;
        
        if (error) {
          console.error('Errore nell\'esecuzione della query:', error);
          console.error('Dettagli completi dell\'errore:', JSON.stringify(error, null, 2));
          throw error;
        }
        
        console.log('Risultati query:', quizData ? quizData.length : 0);
        console.log('Dati quiz:', quizData);
        
        // Ora carichiamo le domande per ogni quiz
        const quizzesWithQuestions = await Promise.all((quizData || []).map(async (quiz) => {
          const { data: questionData, error: questionError } = await supabaseAdmin
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', quiz.id);
            
          if (questionError) {
            console.warn(`Errore nel caricamento delle domande per il quiz ${quiz.id}:`, questionError);
          }
          
          return {
            ...quiz,
            questionCount: questionData?.length || 0,
            quiz_questions: questionData || []
          };
        }));
        
        console.log('Quiz con domande:', quizzesWithQuestions.length);
        
        setQuizzes(quizzesWithQuestions);
        setFilteredQuizzes(quizzesWithQuestions);
      } catch (innerError) {
        console.error('Errore dettagliato:', innerError);
        throw innerError;
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Errore generale nel caricamento dei quiz:', error);
      
      // Log dettagliato dell'errore
      if (error instanceof Error) {
        console.error('Dettagli errore:', error.message);
        console.error('Stack:', error.stack);
        
        // Verifica se è un errore di connessione
        if (error.message.includes('network') || error.message.includes('connection') || error.message.includes('fetch')) {
          toast.error('Errore di connessione al database');
        } else {
          toast.error(`Errore: ${error.message}`);
        }
      } else {
        console.error('Errore non standard:', error);
        toast.error('Errore sconosciuto nel caricamento dei quiz');
      }
      
      setError('Si è verificato un errore durante il caricamento dei quiz. Controlla la console per i dettagli.');
      setLoading(false);
    }
  }, [activeTab, filterMode, mode, userEmail]);

  // Carica i quiz all'avvio e quando cambiano le dipendenze
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        setError(null);
        
        await loadQuizzes();
      } catch (err) {
        console.error('Errore durante il caricamento dei quiz:', err);
        setError('Si è verificato un errore durante il caricamento dei quiz. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [mode, quizType, filterMode, activeTab, selectedCategory]);

  useEffect(() => {
    loadQuizzes();
    
    // Aggiungiamo un messaggio di debug per aiutare a diagnosticare problemi
    console.log('==================== INFORMAZIONI DI DEBUG ====================');
    console.log('- Modalità componente:', mode);
    console.log('- Filtro attivo:', filterMode);
    console.log('- Tipo quiz attivo:', activeTab);
    console.log('- Email utente:', localStorage.getItem('userEmail'));
    console.log('- ID utente:', localStorage.getItem('userId'));
    console.log('- È admin:', isMaster ? 'Sì' : 'No');
    console.log('==============================================================');
    
    // Alert per debug
    if (mode === 'all') {
      console.warn('ATTENZIONE: Sei nella modalità "Quiz Disponibili" con filtro:', filterMode);
    }
    
  }, [loadQuizzes, activeTab, filterMode, selectedCategory, isMaster, mode]);

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
    console.log('Funzione handleCreateQuiz chiamata');
    console.log('Stato attuale showCreator:', showCreator);
    
    // Forza il reset di eventuali quiz selezionati
    setSelectedQuiz(null);
    
    // Implementazione alternativa per forzare l'apertura del creatore
    // Utilizziamo un wrapper in una funzione asincrona con un breve ritardo
    // Questo aiuta a garantire che React abbia tempo di aggiornare lo stato e renderizzare
    const openCreator = async () => {
      // Prima impostiamo lo stato
      setShowCreator(true);
      
      // Poi ci assicuriamo che il DOM si aggiorni
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verifichiamo che lo stato sia effettivamente cambiato
      console.log('Stato showCreator dopo il cambio:', true);
      
      // Forziamo un aggiornamento dello stile per assicurarci che il modale sia visibile
      document.body.style.overflow = 'hidden';
    };
    
    // Eseguiamo la funzione
    openCreator();
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
      console.log('Caricamento categorie disponibili...');
      const { data, error } = await supabaseAdmin
        .from('quiz_templates')
        .select('category')
        .not('category', 'is', null);
      
      if (error) {
        console.error('Errore nel caricamento delle categorie:', error);
        throw error;
      }
      
      if (data) {
        console.log('Dati categorie ricevuti:', data);
        // Filtra le categorie vuote, rimuovi gli spazi e prendi solo valori unici
        const categories = data
          .map(item => (item.category || '').trim())
          .filter(cat => cat && cat.length > 0) // Salta categorie vuote
          .filter((value, index, self) => self.indexOf(value) === index) // Rimuovi duplicati
          .sort();
        
        console.log('Categorie elaborate:', categories);
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
    console.log('==================== APPLICAZIONE FILTRI AVANZATI ====================');
    console.log('Quiz totali prima del filtro:', quizzes.length);
    console.log('Quiz disponibili:', quizzes.map(q => ({
      id: q.id,
      title: q.title,
      created_by: q.created_by,
      visibility: q.visibility,
      category: q.category
    })));
    
    // Assicuriamoci che quizzes sia un array valido
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      console.log('Nessun quiz disponibile da filtrare');
      setFilteredQuizzes([]);
      setCurrentPage(1);
      return;
    }
    
    let result = [...quizzes];
    
    // CRUCIALE: Controllo aggiuntivo per il filtro "Privati"
    // Se il filtro è impostato su "Privati", dobbiamo assicurarci che solo
    // i quiz privati dell'utente vengano mostrati, indipendentemente da
    // come sono stati caricati inizialmente
    if (filterMode === 'private') {
      const email = localStorage.getItem('userEmail');
      if (email) {
        console.log('Applicazione forzata del filtro PRIVATI nei filtri avanzati');
        result = result.filter(quiz => 
          quiz.created_by === email && 
          quiz.visibility === 'private'
        );
        console.log('Quiz dopo filtro privati forzato:', result.length);
      }
    }
    
    // Filtro per testo di ricerca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(quiz => 
        (quiz.title && quiz.title.toLowerCase().includes(query)) || 
        (quiz.description && quiz.description.toLowerCase().includes(query))
      );
    }
    
    // Filtro per categoria
    if (selectedCategory) {
      result = result.filter(quiz => quiz.category === selectedCategory);
    } else if (categoryFilter) {
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
    
    console.log('Quiz filtrati:', result.length);
    console.log('Quiz filtrati dettagli:', result.map(q => ({
      id: q.id,
      title: q.title,
      created_by: q.created_by,
      visibility: q.visibility,
      category: q.category
    })));
    
    // Assicuriamoci che i quiz filtrati siano un array valido
    if (!Array.isArray(result)) {
      console.error('Risultato del filtro non è un array valido:', result);
      result = [];
    }
    
    setFilteredQuizzes(result);
    setCurrentPage(1); // Reset alla prima pagina quando si applicano i filtri
    
    console.log('==================== FINE APPLICAZIONE FILTRI ====================');
  }, [quizzes, searchQuery, categoryFilter, instructorFilter, dateFilter, selectedCategory, filterMode]);
  
  // Applica i filtri quando cambiano i parametri
  useEffect(() => {
    applyAdvancedFilters();
  }, [applyAdvancedFilters, quizzes, searchQuery, categoryFilter, instructorFilter, dateFilter]);
  
  // Applica il filtro per categoria quando la prop selectedCategory cambia
  useEffect(() => {
    if (selectedCategory) {
      console.log('Applicazione filtro per categoria da prop:', selectedCategory);
      setCategoryFilter(selectedCategory);
    }
  }, [selectedCategory]);
  
  // Carica categorie e istruttori all'avvio
  useEffect(() => {
    // Carichiamo sempre le categorie all'avvio del componente, anche se non ci sono quiz
    loadCategories();
    
    // Carichiamo gli istruttori solo se ci sono quiz disponibili
    if (quizzes.length > 0) {
      loadInstructors();
    }
  }, [quizzes, loadCategories, loadInstructors]);
  
  // Calcola i quiz da visualizzare nella pagina corrente
  const paginatedQuizzes = useMemo(() => {
    console.log('==================== CALCOLO QUIZ PAGINATI ====================');
    console.log('Quiz filtrati totali:', filteredQuizzes.length);
    console.log('Pagina corrente:', currentPage);
    console.log('Quiz per pagina:', itemsPerPage);
    
    // Verifica che filteredQuizzes sia un array valido
    if (!Array.isArray(filteredQuizzes) || filteredQuizzes.length === 0) {
      console.log('Nessun quiz filtrato da paginare');
      return [];
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    console.log('Indice di inizio:', startIndex);
    console.log('Indice di fine:', endIndex);
    
    const result = filteredQuizzes.slice(startIndex, endIndex);
    
    console.log('Quiz paginati:', result.length);
    console.log('Quiz paginati dettagli:', result.map(q => ({
      id: q.id,
      title: q.title,
      created_by: q.created_by,
      visibility: q.visibility
    })));
    console.log('==================== FINE CALCOLO QUIZ PAGINATI ====================');
    
    return result;
  }, [filteredQuizzes, currentPage, itemsPerPage]);
  
  // Calcola il numero totale di pagine
  const totalPages = useMemo(() => 
    Math.ceil(filteredQuizzes.length / itemsPerPage),
    [filteredQuizzes]
  );

  // Aggiungo un useEffect per loggare i quiz paginati
  useEffect(() => {
    console.log('==================== RENDERING QUIZLIST ====================');
    console.log('Quiz paginati passati a QuizList:', paginatedQuizzes.length);
    console.log('Quiz paginati dettagli:', paginatedQuizzes.map(q => ({
      id: q.id,
      title: q.title,
      created_by: q.created_by,
      visibility: q.visibility,
      questions: q.questions ? q.questions.length : 0
    })));
    console.log('==================== FINE RENDERING QUIZLIST ====================');
  }, [paginatedQuizzes]);

  // Renderer per i controlli di filtro
  const renderFilterControls = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-3">Filtri</h2>
          <div className="mb-6">
            {/* Contenitore principale dei filtri con scrolling orizzontale */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              {/* Etichetta del filtro */}
              <div className="flex items-center min-w-max">
                <Filter className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400 ml-2">Filtro:</span>
              </div>
              
              {/* Contenitore scorrevole per i pulsanti di filtro */}
              <div className="w-full overflow-x-auto pb-2 flex-1">
                <div className="flex gap-2 min-w-max">
                  <button
                    onClick={() => {
                      setFilterMode('all');
                      setTimeout(() => {
                        console.log('Ricaricamento quiz dopo cambio filtro a "Tutti"');
                        loadQuizzes();
                      }, 100);
                    }}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filterMode === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Tutti
                  </button>
                  <button
                    onClick={() => {
                      setFilterMode('my');
                      setTimeout(() => {
                        console.log('Ricaricamento quiz dopo cambio filtro a "Miei"');
                        loadQuizzes();
                      }, 100);
                    }}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      filterMode === 'my'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Miei
                  </button>
                  <button
                    onClick={() => {
                      setFilterMode('public');
                      setTimeout(() => {
                        console.log('Ricaricamento quiz dopo cambio filtro a "Pubblici"');
                        loadQuizzes();
                      }, 100);
                    }}
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
                    onClick={() => {
                      setFilterMode('private');
                      setQuizzes([]);
                      setFilteredQuizzes([]);
                      console.log('Reset completo e ricaricamento quiz dopo cambio filtro a "Privati"');
                      
                      setTimeout(() => {
                        loadQuizzes();
                      }, 200);
                    }}
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
              </div>
              
              {/* Pulsante filtri avanzati */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600 flex items-center gap-1 mt-2 sm:mt-0 min-w-max"
              >
                {showAdvancedFilters ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Nascondi filtri avanzati</span>
                    <span className="sm:hidden">Nascondi filtri</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Mostra filtri avanzati</span>
                    <span className="sm:hidden">Filtri avanzati</span>
                  </>
                )}
              </button>
            </div>
            
            {showAdvancedFilters && (
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg mb-4">
                {/* Contenitore per filtri avanzati con scrolling e disposizione responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      {availableCategories.length > 0 ? (
                        availableCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Nessuna categoria disponibile</option>
                      )}
                    </select>
                    {availableCategories.length === 0 && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Nessuna categoria trovata. Aggiungi categorie quando crei o modifichi un quiz.
                      </p>
                    )}
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
                </div>
                
                {/* Pulsanti di reset */}
                <div className="flex justify-end gap-2 mt-4">
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
              <div className="text-center sm:text-left mb-2 sm:mb-0">
                {filteredQuizzes.length === 0 ? (
                  <span>Nessun quiz disponibile</span>
                ) : (
                  <span>
                    Mostrando {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredQuizzes.length)} di {filteredQuizzes.length} quiz
                  </span>
                )}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md text-xs sm:text-sm bg-gray-100 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Prima pagina"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 -ml-3" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-slate-800"
                    aria-label="Pagina precedente"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  
                  <div className="flex items-center overflow-x-auto px-1 gap-1 max-w-[180px] sm:max-w-none">
                    {/* Paginazione adattiva che mostra solo alcune pagine su mobile */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Su schermi piccoli, mostra solo alcune pagine intorno alla pagina corrente
                        if (window.innerWidth < 640) {
                          return page === 1 || 
                                 page === totalPages || 
                                 Math.abs(page - currentPage) <= 1;
                        }
                        return true;
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-2 py-1 sm:px-3 sm:py-1 rounded-md text-xs sm:text-sm ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-slate-800"
                    aria-label="Pagina successiva"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-md text-xs sm:text-sm bg-gray-100 dark:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Ultima pagina"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 -ml-3" />
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
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
            {mode === 'all' 
              ? <><BookOpen className="w-6 h-6 mr-2" /> Quiz Disponibili</> 
              : <><Layers className="w-6 h-6 mr-2" /> Gestione Quiz</>}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'all'
              ? 'Esplora tutti i quiz disponibili nel sistema' 
              : 'Crea, modifica e gestisci i tuoi quiz'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {mode === 'manage' && (
            <button
              onClick={() => {
                console.log('Pulsante "Crea Nuovo Quiz" cliccato');
                handleCreateQuiz();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Crea Nuovo Quiz</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Filtri e tabs */}
      <div className="mt-8 mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('learning')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'learning'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            } cursor-pointer`}
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
            } cursor-pointer`}
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
            } cursor-pointer`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>Quiz Interattivi</span>
            </div>
          </button>
        </div>
      </div>

      {renderFilterControls()}
      
      {/* Messaggio informativo quando non ci sono quiz */}
      {!loading && filteredQuizzes.length === 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <InfoIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-300">
                {filterMode === 'private' 
                  ? 'Nessun quiz privato disponibile' 
                  : filterMode === 'public' 
                    ? 'Nessun quiz pubblico disponibile'
                    : filterMode === 'my' 
                      ? 'Non hai ancora creato quiz'
                      : 'Nessun quiz disponibile'}
              </h3>
              <p className="text-blue-700 dark:text-blue-400 mt-2 text-sm">
                {filterMode === 'private' 
                  ? 'Non hai ancora creato quiz privati di tipo ' + activeTab + '. I quiz privati sono visibili solo al creatore.' 
                  : filterMode === 'public' 
                    ? 'Non ci sono quiz pubblici di tipo ' + activeTab + ' disponibili al momento.'
                    : filterMode === 'my' 
                      ? 'Non hai ancora creato quiz di tipo ' + activeTab + '. Crea il tuo primo quiz utilizzando il pulsante "Crea Nuovo Quiz".'
                      : 'Nessun quiz disponibile con i filtri selezionati.'}
              </p>
              <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-800/30 rounded">
                <p className="text-blue-800 dark:text-blue-300 text-sm flex items-center">
                  <span className="mr-1">💡</span>
                  <strong>Suggerimento:</strong> 
                  {mode === 'manage'
                    ? ' Crea un nuovo quiz o cambia i filtri per visualizzare i quiz esistenti.'
                    : ' Prova a cambiare il tipo di quiz o i filtri per trovare contenuti diversi.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORTANTE: Renderizza il QuizCreator se showCreator è true */}
      {showCreator && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto" style={{display: showCreator ? 'block' : 'none'}}>
          <div className="min-h-screen py-8 flex items-center justify-center">
            <QuizCreator
              quizType={activeTab}
              hostEmail={userEmail || undefined}
              editQuiz={selectedQuiz || undefined}
              onClose={() => {
                console.log('Chiusura QuizCreator');
                setShowCreator(false);
                setSelectedQuiz(null);
                document.body.style.overflow = 'auto';
              }}
              onSaveSuccess={() => {
                console.log('Quiz salvato con successo');
                setShowCreator(false);
                setSelectedQuiz(null);
                document.body.style.overflow = 'auto';
                loadQuizzes(); // Ricarica i quiz dopo il salvataggio
                toast.success('Quiz salvato con successo!');
              }}
            />
          </div>
        </div>
      )}

      {/* In caso contrario, mostra i quiz o un messaggio appropriato */}
      {!showCreator && (
        loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div></div>
        ) : (
          <>
            <QuizList
              quizzes={paginatedQuizzes}
              onEdit={mode === 'manage' ? (quiz) => {
                console.log('Editing quiz:', quiz);
                // Carica le domande del quiz selezionato
                const loadQuizWithQuestions = async () => {
                  try {
                    console.log('Caricamento quiz con domande per ID:', quiz.id);
                    
                    // Prima carica il quiz
                    const { data: quizData, error: quizError } = await supabaseAdmin
                      .from('quiz_templates')
                      .select('*')
                      .eq('id', quiz.id)
                      .single();
                    
                    if (quizError) {
                      console.error('Errore nel caricamento del quiz:', quizError);
                      console.error('Quiz error details:', JSON.stringify(quizError, null, 2));
                      showError('Errore', `Impossibile caricare il quiz: ${quizError.message}`);
                      return;
                    }
                    
                    if (!quizData) {
                      console.error('Nessun quiz trovato con ID:', quiz.id);
                      showError('Errore', 'Quiz non trovato');
                      return;
                    }
                    
                    console.log('Quiz caricato:', quizData);
                    
                    // Poi carica le domande separatamente
                    const questionsTableName = quiz.quiz_type === 'interactive' ? 'interactive_quiz_questions' : 'quiz_questions';
                    console.log(`Caricamento domande dalla tabella: ${questionsTableName} per quiz ID: ${quiz.id}`);
                    
                    const { data: questionsData, error: questionsError } = await supabaseAdmin
                      .from(questionsTableName)
                      .select('*')
                      .eq('quiz_id', quiz.id)
                      .order('created_at', { ascending: true });
                    
                    console.log('Risultato query domande:', questionsData ? `${questionsData.length} domande trovate` : 'Nessun dato');
                    console.log('Errore query domande:', questionsError ? JSON.stringify(questionsError, null, 2) : 'Nessun errore');
                    
                    if (questionsError) {
                      console.error(`Errore nel caricamento delle domande da ${questionsTableName}:`, questionsError);
                      console.error('Questions error details:', JSON.stringify(questionsError, null, 2));
                      showError('Errore', `Impossibile caricare le domande: ${questionsError.message}`);
                      
                      // Prova un approccio alternativo
                      console.log('Tentativo alternativo di caricamento domande...');
                      const { data: altData, error: altError } = await supabaseAdmin
                        .from('quiz_questions')
                        .select('*')
                        .eq('quiz_id', quiz.id);
                        
                      console.log('Risultato query alternativa:', altData ? `${altData.length} domande trovate` : 'Nessun dato');
                      console.log('Errore query alternativa:', altError ? JSON.stringify(altError, null, 2) : 'Nessun errore');
                        
                      if (altError || !altData || altData.length === 0) {
                        console.error('Anche il tentativo alternativo è fallito:', altError);
                        // Continuiamo comunque con il quiz senza domande
                      } else {
                        console.log('Domande caricate con metodo alternativo:', altData);
                        quizData.questions = altData;
                      }
                    } else {
                      console.log('Domande caricate:', questionsData);
                      quizData.questions = questionsData;
                    }
                    
                    console.log('Quiz completo con domande:', quizData);
                    setSelectedQuiz(quizData);
                    setShowCreator(true);
                  } catch (error) {
                    console.error('Errore durante il caricamento del quiz:', error);
                    showError('Errore', 'Impossibile caricare il quiz. Riprova più tardi.');
                  }
                };
                
                loadQuizWithQuestions();
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
              onTestQuiz={handleTestQuiz}
              isMaster={isMaster}
              viewMode={mode}
            />
          </>
        )
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
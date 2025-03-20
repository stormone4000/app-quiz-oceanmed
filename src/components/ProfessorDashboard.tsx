import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './layout/DashboardLayout';
import { QuizManager } from './instructor/QuizManager';
import { AccessCodeManager } from './instructor/AccessCodeManager';
import { AdminInstructorCodesManager } from './admin/AdminInstructorCodesManager';
import { VideoManager } from './instructor/VideoManager';
import { UserManagement } from './instructor/UserManagement';
import { UserProfile } from './profile/UserProfile';
import { QuizSelection } from './QuizSelection';
import { QuizCategories } from './QuizCategories';
import { Quiz } from './student/Quiz';
import { StudentLeaderboard } from './instructor/StudentLeaderboard';
import { SubscriptionManager } from './instructor/SubscriptionManager';
import { StudentManagement } from './instructor/StudentManagement';
import { NotificationManager } from './notifications/NotificationManager';
import { DashboardStats } from './admin/DashboardStats';
import { QuizLiveMain } from './interactive/QuizLiveMain';
import type { QuizResult } from '../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Users, Target, CheckCircle2, Trophy, Star, Book, ArrowRight, Key, Plus } from 'lucide-react';
import type { QuizType } from '../types';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectIsMasterAdmin, 
  selectHasInstructorAccess, 
  selectHasActiveAccess,
  selectIsInstructor,
  selectUserEmail,
  updateInstructorAccess
} from '../redux/slices/authSlice';
import { supabase } from '../services/supabase';
import { DashboardTab } from '../types-dashboard';
import { InstructorProfile } from './profile/InstructorProfile';
import { useLocation } from 'react-router-dom';
import { setActiveTab as setReduxActiveTab } from '../redux/slices/uiSlice';

// Importiamo il tipo DashboardTab dal file DashboardLayout

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface ProfessorDashboardProps {
  results: QuizResult[];
  onLogout: () => void;
  hostEmail?: string;
  needsSubscription?: boolean;
  isMaster?: boolean;
}

const ProfessorDashboard: React.FC<ProfessorDashboardProps> = ({
  results,
  onLogout,
  hostEmail,
  needsSubscription: propNeedsSubscription,
  isMaster: propIsMaster
}) => {
  /**
   * Gestione dello stato:
   * - Utilizziamo Redux per i dati di autenticazione (isMaster, hasInstructorAccess, hasActiveAccess, isProfessor)
   * - Manteniamo uno stato locale per userEmail con priorità: 
   *   1. hostEmail (prop)
   *   2. userEmailFromRedux (Redux)
   *   3. localStorage (fallback)
   * - Per needsSubscription utilizziamo il prop propNeedsSubscription se disponibile
   * - Sincronizziamo hasInstructorAccess con hasActiveAccess tramite Redux quando necessario
   */
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [quizType, setQuizType] = useState<'exam' | 'learning' | 'interactive' | null>('exam');
  const [selectedCategory, setSelectedCategory] = useState<string | null>('');
  const [isCodeDeactivated, setIsCodeDeactivated] = useState(false);
  const [needsSubscription, setNeedsSubscription] = useState(propNeedsSubscription || false);
  const [totalInstructors, setTotalInstructors] = useState(0);
  const [dbTotalStudents, setDbTotalStudents] = useState(0);
  const [dbTotalAttempts, setDbTotalAttempts] = useState(0);
  const [quizCodeToActivate, setQuizCodeToActivate] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  // Utilizziamo Redux per ottenere lo stato dell'utente
  const isMaster = useSelector(selectIsMasterAdmin);
  const hasInstructorAccess = useSelector(selectHasInstructorAccess);
  const hasActiveAccess = useSelector(selectHasActiveAccess);
  const isProfessor = useSelector(selectIsInstructor);
  const userEmailFromRedux = useSelector(selectUserEmail);
  const dispatch = useDispatch();
  
  // Utilizziamo la prop isMaster con priorità rispetto a Redux
  const effectiveIsMaster = propIsMaster !== undefined ? propIsMaster : isMaster;

  console.log("ProfessorDashboard - propIsMaster:", propIsMaster, "isMaster (Redux):", isMaster, "effectiveIsMaster:", effectiveIsMaster);
  
  // Stato locale per userEmail, con priorità al prop hostEmail
  const [userEmail, setUserEmail] = useState(hostEmail || userEmailFromRedux || '');
  
  // Otteniamo la posizione corrente dall'URL
  const location = useLocation();
  
  // Effetto per sincronizzare il tab attivo con l'URL corrente
  useEffect(() => {
    // Mappa dei percorsi URL ai tab del dashboard
    const pathToTabMap: Record<string, DashboardTab> = {
      '/dashboard': 'dashboard',
      '/quizzes': 'quizzes',
      '/gestione-quiz': 'gestione-quiz',
      '/gestione-alunni': 'gestione-alunni',
      '/instructor-access-codes': 'instructor-access-codes',
      '/videos': 'videos',
      '/quiz-studenti': 'quiz-studenti',
      '/quiz-live': 'quiz-live',
      '/students': 'students',
      '/subscriptions': 'subscriptions',
      '/notifications': 'notifications',
      '/profile/instructor': 'profile'
    };
    
    const path = location.pathname;
    
    if (pathToTabMap[path]) {
      console.log(`[ProfessorDashboard] URL corrente ${path} corrisponde al tab ${pathToTabMap[path]}`);
      
      // Aggiorniamo sia lo stato Redux che lo stato locale
      dispatch(setReduxActiveTab(pathToTabMap[path]));
      setActiveTab(pathToTabMap[path]);
      
      console.log(`[ProfessorDashboard] Tab impostato a ${pathToTabMap[path]} in base all'URL`);
    } else {
      console.log(`[ProfessorDashboard] URL ${path} non corrisponde a nessun tab conosciuto`);
    }
    
    // Se abbiamo uno stato nella navigazione, usalo (compatibilità)
    if (location.state && location.state.activeTab) {
      console.log(`[ProfessorDashboard] Trovato activeTab=${location.state.activeTab} nello stato location`);
      dispatch(setReduxActiveTab(location.state.activeTab));
      setActiveTab(location.state.activeTab);
    }
  }, [location.pathname, dispatch]);
  
  useEffect(() => {
    // Sincronizziamo lo stato locale con Redux e props
    setIsCodeDeactivated(localStorage.getItem('isCodeDeactivated') === 'true');
    
    // Aggiungi event listener per i cambiamenti nel localStorage
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdated', handleStorageChange);
    };
  }, []);
  
  const handleStorageChange = () => {
    // Utilizziamo i valori da Redux dove possibile
    // Nota: isMaster, hasActiveAccess, hasInstructorAccess e isProfessor sono già gestiti da Redux
    
    // Per userEmail, controlliamo prima hostEmail (prop) e poi Redux
    if (hostEmail) {
      setUserEmail(hostEmail);
    } else if (userEmailFromRedux) {
      setUserEmail(userEmailFromRedux);
    } else {
      setUserEmail(localStorage.getItem('userEmail') || '');
    }
    
    // Per needsSubscription, controlliamo prima propNeedsSubscription (prop)
    if (propNeedsSubscription !== undefined) {
      setNeedsSubscription(propNeedsSubscription);
    }
    
    setIsCodeDeactivated(localStorage.getItem('isCodeDeactivated') === 'true');
    
    // Caso speciale per marcosrenatobruno@gmail.com (ADMIN)
    if (userEmailFromRedux === 'marcosrenatobruno@gmail.com' || userEmail === 'marcosrenatobruno@gmail.com') {
      console.log('[ProfessorDashboard] Utente admin marcosrenatobruno@gmail.com rilevato');
      dispatch(updateInstructorAccess({ hasInstructorAccess: true }));
    }
    
    console.log('[ProfessorDashboard] handleStorageChange: stato aggiornato');
  };
  
  // Sincronizziamo hasInstructorAccess con hasActiveAccess se l'utente è un professore
  useEffect(() => {
    if (isProfessor && hasActiveAccess && !hasInstructorAccess) {
      console.log('[ProfessorDashboard] Sincronizzazione hasInstructorAccess con hasActiveAccess da Redux');
      // Utilizziamo il dispatcher Redux per aggiornare lo stato
      dispatch(updateInstructorAccess({ hasInstructorAccess: true }));
    }
    
    // Caso speciale per marcosrenatobruno@gmail.com (ADMIN)
    if (userEmail === 'marcosrenatobruno@gmail.com' || userEmailFromRedux === 'marcosrenatobruno@gmail.com') {
      console.log('[ProfessorDashboard] Utente admin marcosrenatobruno@gmail.com rilevato in useEffect');
      dispatch(updateInstructorAccess({ hasInstructorAccess: true }));
    }
  }, [isProfessor, hasActiveAccess, hasInstructorAccess, dispatch, userEmail, userEmailFromRedux]);
  
  // Aggiorniamo lo stato locale quando cambiano i props
  useEffect(() => {
    if (hostEmail) {
      console.log('[ProfessorDashboard] Aggiornamento userEmail da props:', hostEmail);
      setUserEmail(hostEmail);
    } else if (userEmailFromRedux) {
      console.log('[ProfessorDashboard] Aggiornamento userEmail da Redux:', userEmailFromRedux);
      setUserEmail(userEmailFromRedux);
    }
    
    if (propNeedsSubscription !== undefined) {
      console.log('[ProfessorDashboard] Aggiornamento needsSubscription da props:', propNeedsSubscription);
      setNeedsSubscription(propNeedsSubscription);
    }
  }, [hostEmail, propNeedsSubscription, userEmailFromRedux]);

  useEffect(() => {
    loadTotalInstructors();
    loadTotalStudents();
    loadTotalAttempts();
    
    // Imposta il tipo di quiz e la categoria di default
    setQuizType('exam');
    setSelectedCategory('');
    
    // Verifica lo stato della connessione a Supabase
    const checkSupabaseConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_templates')
          .select('id')
          .limit(1);
          
        if (error) {
          console.error('Errore di connessione a Supabase:', error);
          setSupabaseStatus('error');
          return;
        }
        
        console.log('Connessione a Supabase stabilita con successo');
        setSupabaseStatus('connected');
      } catch (err) {
        console.error('Eccezione durante la verifica della connessione a Supabase:', err);
        setSupabaseStatus('error');
      }
    };
    
    checkSupabaseConnection();
  }, []);

  const loadTotalInstructors = async () => {
    try {
      // Utilizziamo una query per contare gli utenti con is_instructor = true
      const { data, error } = await supabase
        .from('auth_users')
        .select('count')
        .eq('is_instructor', true);
      
      if (error) {
        console.error('Errore nel caricamento del numero di istruttori:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setTotalInstructors(data[0].count);
        console.log('Numero totale di istruttori:', data[0].count);
      }
    } catch (error) {
      console.error('Errore nel caricamento del numero di istruttori:', error);
    }
  };

  const loadTotalStudents = async () => {
    try {
      // Utilizziamo una query per contare gli utenti che non sono istruttori e non sono admin
      const { data, error } = await supabase
        .from('auth_users')
        .select('count')
        .eq('is_instructor', false)
        .eq('is_master', false);
      
      if (error) {
        console.error('Errore nel caricamento del numero di studenti:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setDbTotalStudents(data[0].count);
        console.log('Numero totale di studenti:', data[0].count);
      }
    } catch (error) {
      console.error('Errore nel caricamento del numero di studenti:', error);
    }
  };

  // Funzione per caricare il numero totale di tentativi
  const loadTotalAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('results')
        .select('count');
      
      if (error) {
        console.error('Errore nel caricamento del numero di tentativi:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setDbTotalAttempts(data[0].count);
        console.log('Numero totale di tentativi:', data[0].count);
      }
    } catch (error) {
      console.error('Errore nel caricamento del numero di tentativi:', error);
    }
  };
  
  // Funzione per attivare un quiz tramite codice
  const handleActivateQuizCode = async () => {
    if (!quizCodeToActivate?.trim()) return;
    
    try {
      // Ottieni l'email dell'utente corrente
      const userEmail = localStorage.getItem('userEmail') || '';
      
      // Verifica se il codice esiste
      const { data: codeExists, error: codeError } = await supabase
        .from('quiz_templates')
        .select('id, title')
        .eq('quiz_code', quizCodeToActivate.trim())
        .single();
      
      if (codeError || !codeExists) {
        alert('Codice quiz non valido o inesistente');
        return;
      }
      
      // Chiama la stored procedure per clonare il quiz
      const { data: quizData, error: cloneError } = await supabase
        .rpc('clone_quiz_by_code', {
          p_quiz_code: quizCodeToActivate.trim(),
          p_user_email: userEmail
        });
      
      if (cloneError) {
        console.error('Errore durante la duplicazione del quiz:', cloneError);
        alert('Si è verificato un errore durante la duplicazione del quiz');
        return;
      }
      
      // Resetta il campo input
      setQuizCodeToActivate('');
      
      // Mostra un messaggio di successo
      alert(`Il quiz "${codeExists.title}" è stato duplicato con successo nella tua collezione personale.`);
      
    } catch (err) {
      console.error("Errore durante l'attivazione del quiz:", err);
      alert("Si è verificato un errore durante l'attivazione del quiz");
    }
  };
  
  const renderContent = () => {
    // Se l'utente è un istruttore e non ha accesso attivo, mostriamo solo la tab del profilo
    // Questo controllo è ora allineato con la logica della Sidebar
    if (isProfessor && !hasActiveAccess && activeTab !== 'profile' && !effectiveIsMaster) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="text-2xl font-bold mb-4">Accesso non autorizzato</h2>
          <p className="text-gray-600 mb-4">
            Non hai un codice di accesso attivo. Vai al tuo profilo per attivare un codice.
          </p>
          <button
            onClick={() => setActiveTab('profile')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Vai al profilo
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'students':
        return <UserManagement />;
      case 'notifications':
        return <NotificationManager />;
      case 'quiz-live':
        return <QuizLiveMain 
          userEmail={userEmail} 
          userRole={isProfessor ? 'instructor' : 'student'} 
        />;
      case 'pro-codes':
        // Solo gli admin possono accedere a questa tab
        if (!effectiveIsMaster) {
          return (
            <div className="flex flex-col items-center justify-center p-8">
              <h2 className="text-2xl font-bold mb-4">Accesso non autorizzato</h2>
              <p className="text-gray-600 mb-4">
                Solo gli amministratori possono gestire i codici PRO per gli istruttori.
              </p>
            </div>
          );
        }
        return <AdminInstructorCodesManager />;
      case 'quizzes':
        return (
          <div className="p-4">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Quiz Disponibili</h3>
              
              {/* Titolo Esplora Quiz */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Esplora Quiz</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Esplora e prova i quiz disponibili</p>
              </div>
            </div>
            
            {/* Selezione categoria */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2 text-slate-900 dark:text-white">Seleziona Categoria</h3>
              
              {/* Aggiungeremo un'indicazione di caricamento */}
              <div className="relative">
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 outline-none text-ellipsis"
                  style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
                >
                  <option value="">Tutte le categorie</option>
                  {/* Le categorie verranno caricate dinamicamente dal QuizManager */}
                  {/* Non abbiamo bisogno di opzioni statiche qui */}
                </select>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Le categorie vengono caricate in base ai quiz disponibili
                </p>
              </div>
            </div>
            
            {/* QuizManager con i tab */}
            <QuizManager
              mode="all"
              selectedCategory={selectedCategory}
              userEmail={userEmail}
            />
          </div>
        );
      case 'stats':
        return renderDashboard();
      case 'profile':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Profilo Utente</h2>
            <InstructorProfile 
              userEmail={userEmail}
              needsSubscription={needsSubscription}
            />
          </div>
        );
      case 'videos':
        return <VideoManager userEmail={userEmail} />;
      case 'subscriptions':
        return <SubscriptionManager />;
      case 'gestione-alunni':
        return <StudentManagement />;
      case 'gestione-quiz':
        return <QuizManager mode="manage" userEmail={userEmail} />;
      case 'access-codes':
      case 'instructor-access-codes':
        return <AccessCodeManager />;
      case 'quiz-studenti':
        if (quizType) {
          if (selectedCategory) {
            return (
              <Quiz
                quizId={selectedCategory}
                onBack={() => setSelectedCategory(null)}
                studentEmail="instructor@example.com"
              />
            );
          }
          return (
            <QuizCategories
              type={quizType}
              onBack={() => setQuizType(null)}
              onSelectCategory={setSelectedCategory}
            />
          );
        }
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 px-4 sm:px-6 md:px-8">Quiz Studenti</h2>
            <div className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
              <StudentLeaderboard />
            </div>
            <div className="mt-8">
              <QuizSelection
                onSelectQuizType={(type) => setQuizType(type)}
                onShowDashboard={() => setActiveTab('stats')}
              />
            </div>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    // Utilizziamo i dati dal database se siamo admin, altrimenti calcoliamo dai risultati
    const totalAttempts = effectiveIsMaster ? dbTotalAttempts : results.length;
    const averageScore = results.length > 0 ? results.reduce((acc, curr) => acc + curr.score, 0) / results.length : 0;
    const passedAttempts = results.filter(r => r.score >= 0.75).length;
    const failedAttempts = results.length - passedAttempts;
    // Utilizziamo i dati dal database se siamo admin, altrimenti calcoliamo dai risultati
    const totalStudents = effectiveIsMaster ? dbTotalStudents : new Set(results.map(r => r.email)).size;

    // Get top 5 students
    const studentScores = results.reduce((acc: { [key: string]: { score: number, attempts: number, name: string } }, curr) => {
      if (!acc[curr.email]) {
        acc[curr.email] = {
          score: 0,
          attempts: 0,
          name: `${curr.firstName || ''} ${curr.lastName || ''}`.trim() || curr.email
        };
      }
      acc[curr.email].score += curr.score;
      acc[curr.email].attempts += 1;
      return acc;
    }, {});

    const topStudents = Object.entries(studentScores)
      .map(([email, data]) => ({
        email,
        name: data.name,
        averageScore: data.score / data.attempts
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);

    const pieData = {
      labels: ['Superati', 'Non Superati'],
      datasets: [
        {
          data: [passedAttempts, failedAttempts],
          backgroundColor: ['#22c55e', '#ef4444'],
          borderColor: ['#16a34a', '#dc2626'],
          borderWidth: 1,
        },
      ],
    };

    const categoryResults = results.reduce((acc: { [key: string]: number[] }, curr) => {
      if (!acc[curr.category]) {
        acc[curr.category] = [];
      }
      acc[curr.category].push(curr.score);
      return acc;
    }, {});

    const categoryAverages = Object.entries(categoryResults).map(([category, scores]) => ({
      category,
      average: scores.reduce((a, b) => a + b, 0) / scores.length
    }));

    const barData = {
      labels: categoryAverages.map(c => c.category),
      datasets: [
        {
          label: 'Media Punteggi per Categoria',
          data: categoryAverages.map(c => c.average * 100),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
        },
      ],
    };

    return (
      <div className="space-y-8 px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">
          {effectiveIsMaster ? 'Dashboard Admin Master' : 'Dashboard Istruttore'}
        </h2>

        {/* Mostra le statistiche aggregate solo per gli admin master */}
        {effectiveIsMaster && (
          <DashboardStats />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="group relative rounded-xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Studenti Totali</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalStudents}</p>
          </div>

          {effectiveIsMaster && (
            <div className="group relative rounded-xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 p-6 hover:scale-[1.02] transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Istruttori Totali</h3>
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalInstructors}</p>
            </div>
          )}

          <div className="group relative rounded-xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tentativi Totali</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{totalAttempts}</p>
          </div>

          <div className="group relative rounded-xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Media Punteggi</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">
              {(averageScore * 100).toFixed(1)}%
            </p>
          </div>

          <div className="group relative rounded-xl bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-xl">
                <Target className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tasso di Successo</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">
              {((passedAttempts / totalAttempts) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Top 5 Students */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Top 5 Studenti</h3>
            </div>
            <button
              onClick={() => setActiveTab('gestione-alunni')}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2"
            >
              Vedi Tutti
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {topStudents.map((student, index) => (
              <div
                key={student.email}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  index === 0
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-gray-500 dark:text-slate-400 w-8">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-white">{student.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-blue-600 dark:text-blue-400">
                    {(student.averageScore * 100).toFixed(1)}%
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Media</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden p-6">
            <h3 className="text-lg font-semibold mb-6 text-slate-800 dark:text-white">Distribuzione Risultati</h3>
            <div className="w-full max-w-xs mx-auto">
              <Pie data={pieData} options={{ responsive: true }} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden p-6">
            <h3 className="text-lg font-semibold mb-6 text-slate-800 dark:text-white">Performance per Categoria</h3>
            <Bar
              data={barData}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: value => `${value}%`,
                      color: 'rgb(148 163 184)'
                    }
                   },
                   x: {
                     ticks: {
                       color: 'rgb(148 163 184)'
                     }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Recent Quiz Results */}
        <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Book className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold dark:text-slate-100">Quiz Recenti</h3>
              </div>
              <button
                onClick={() => setActiveTab('quiz-studenti')}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2"
              >
                Vedi Tutti
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Studente</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Categoria</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Punteggio</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {results.slice(0, 5).map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium dark:text-slate-100">
                          {result.firstName} {result.lastName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">{result.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                        {result.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${
                        result.score >= 0.75 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(result.score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                      {new Date(result.date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      onLogout={onLogout}
      studentEmail={userEmail}
      isMaster={effectiveIsMaster}
      supabaseStatus={supabaseStatus}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default ProfessorDashboard;
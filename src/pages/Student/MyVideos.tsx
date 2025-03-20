import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ActivatedVideoList } from '../../components/student/ActivatedVideoList';
import { ContentActivation } from '../../components/student/ContentActivation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { AlertCircle, Video } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { logout, selectAuth } from '../../redux/slices/authSlice';
import { purgeStore } from '../../redux/store';
import { DashboardTab } from '../../types-dashboard';

export function MyVideosPage() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('video');
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);

  // Funzione di logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      dispatch(logout());
      await purgeStore();
      navigate('/login');
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  // Carica l'ID dello studente utilizzando una combinazione di localStorage e Supabase
  useEffect(() => {
    const getStudentId = async () => {
      try {
        setLoading(true);
        
        // Prima controlla se è autenticato usando localStorage
        const userEmail = localStorage.getItem('userEmail');
        const isStudent = localStorage.getItem('isProfessor') !== 'true';
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        
        if (!userEmail || !isStudent || !isAuthenticated) {
          console.log('Nessun utente autenticato o non è uno studente:', { userEmail, isStudent, isAuthenticated });
          setError('Effettua il login come studente per vedere i tuoi contenuti.');
          setLoading(false);
          return;
        }

        console.log('Tentativo di recupero ID studente per:', userEmail);
        
        // Recupera l'ID studente da Supabase usando l'email (dalla tabella auth_users)
        const { data: userData, error: userError } = await supabase
          .from('auth_users')
          .select('id')
          .eq('email', userEmail)
          .single();
          
        if (userError) {
          console.error('Errore nel recupero del profilo studente:', userError);
          
          // Prova con un approccio alternativo - cerca per email anziché user_id
          const { data: userByEmail, error: emailError } = await supabase
            .from('auth_users')
            .select('id')
            .eq('email', userEmail)
            .single();
            
          if (emailError || !userByEmail) {
            console.error('Errore anche nel recupero del profilo studente tramite email:', emailError);
            setError('Profilo studente non trovato. Contatta l\'assistenza.');
            setLoading(false);
            return;
          }
          
          console.log('ID studente trovato tramite email:', userByEmail.id);
          setStudentId(userByEmail.id);
          setLoading(false);
          return;
        }
        
        if (!userData) {
          console.log('Profilo studente non trovato');
          setError('Profilo studente non trovato. Contatta l\'assistenza.');
          setLoading(false);
          return;
        }
        
        console.log('ID studente trovato:', userData.id);
        setStudentId(userData.id);
        
      } catch (err) {
        console.error('Errore imprevisto:', err);
        setError('Si è verificato un errore durante il caricamento del profilo. Riprova.');
      } finally {
        setLoading(false);
      }
    };
    
    getStudentId();
  }, []);

  // Gestisce il successo dell'attivazione dei contenuti
  const handleActivationSuccess = () => {
    // Incrementa la chiave di refresh per forzare il ricaricamento dell'elenco video
    setRefreshKey(prev => prev + 1);
    // Passa alla tab dei video
    setActiveTab('video');
  };

  // Gestisce i cambiamenti di tab nella sidebar
  const handleTabChange = (tab: DashboardTab) => {
    console.log('Navigazione verso:', tab);
    
    // Gestione speciale per tab che richiedono url specifici
    if (tab === 'dashboard') {
      navigate('/dashboard');
    } else if (tab === 'my-videos') {
      navigate('/my-videos');
    } else if (tab === 'profile') {
      navigate('/profile/student');
    } else if (tab === 'student-quiz') {
      navigate('/dashboard', { state: { activeTab: 'student-quiz' } });
    } else if (tab === 'quiz-history') {
      navigate('/dashboard', { state: { activeTab: 'quiz-history' } });
    } else if (tab === 'student-access-codes') {
      navigate('/dashboard', { state: { activeTab: 'student-access-codes' } });
    } else if (tab === 'quiz-live') {
      navigate('/quiz-live');
    } else if (tab === 'quizzes') {
      navigate('/dashboard', { state: { activeTab: 'quizzes' } });
    } else if (tab === 'notifications') {
      navigate('/dashboard', { state: { activeTab: 'notifications' } });
    } else {
      // Fallback per altre tab
      navigate('/dashboard', { state: { activeTab: tab } });
    }
  };

  // Contenuto della pagina
  const pageContent = () => {
    if (loading) {
      return (
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-500 w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-1">Errore</h2>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      );
    }

    if (!studentId) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-lg">
            <p className="text-yellow-700 dark:text-yellow-300">
              Accesso non autorizzato. Effettua il login come studente per visualizzare questa pagina.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">I Miei Video</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Visualizza i video didattici attivati o inserisci un nuovo codice di attivazione
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-lg">
            <Video className="text-blue-500 w-5 h-5" />
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              Attiva nuovi contenuti per accedere a più video
            </span>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              I Miei Video
            </TabsTrigger>
            <TabsTrigger value="activation" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
              Attiva Contenuti
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="video" className="mt-6">
            <ActivatedVideoList key={refreshKey} studentId={studentId} />
          </TabsContent>
          
          <TabsContent value="activation" className="mt-6">
            <div className="max-w-lg mx-auto">
              <ContentActivation 
                studentId={studentId} 
                onActivationSuccess={handleActivationSuccess} 
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <DashboardLayout
      activeTab="my-videos"
      onTabChange={handleTabChange}
      onLogout={handleLogout}
      studentEmail={auth.userEmail || ''}
    >
      {pageContent()}
    </DashboardLayout>
  );
} 
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';
import ProfessorDashboard from './components/ProfessorDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { QuizLiveLayout } from './components/interactive/QuizLiveLayout';
import { TestQuizPage } from './pages/TestQuiz/TestQuizPage';
import { ThemeProvider } from './components/theme-provider';
import { LoginDemo } from './components/auth/LoginDemo';
import { RegistrationPage } from './components/registration/RegistrationPage';
import { QuizLive } from './components/interactive/QuizLive';
import { QuizJoin } from './components/interactive/QuizJoin';
import { QuizWaiting } from './components/interactive/QuizWaiting';
import { QuizPlay } from './components/interactive/QuizPlay';
import { QuizLeaderboard } from './components/interactive/QuizLeaderboard';
import { StudentProfile } from './components/profile/StudentProfile';
import { InstructorProfile } from './components/profile/InstructorProfile';
import { UserRole, QuizResult } from './types';
import { supabase } from './services/supabase';
import { getQuizResults } from './services/api';
import { useAppSelector, useAppDispatch } from './redux/hooks';
import { selectAuth, logout, syncFromStorage, login } from './redux/slices/authSlice';
import { purgeStore } from './redux/store';
import { QuizLiveMain } from './components/interactive/QuizLiveMain';
import { setupAllStorage } from './utils/setupStorage';
import { Toaster } from 'react-hot-toast';
import { MyVideosPage } from './pages/Student/MyVideos';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RouteListener } from './components/system/RouteListener';

// Creazione componenti wrapper per InstructorProfile e StudentProfile
function ProfileWrapper({component}: {component: React.ElementType}) {
  const auth = useAppSelector(selectAuth);
  const dispatch = useAppDispatch();
  const Component = component;
  
  console.log("Rendering ProfileWrapper con:", {
    userEmail: auth.userEmail,
    needsSubscription: auth.needsSubscription,
    isAuthenticated: auth.isAuthenticated
  });
  
  // Assicuriamoci che i dati dell'utente siano disponibili
  if (!auth.userEmail && localStorage.getItem('userEmail')) {
    console.log("Dati auth mancanti, utilizzando localStorage");
  }
  
  const email = auth.userEmail || localStorage.getItem('userEmail') || '';
  const needsSub = auth.needsSubscription || localStorage.getItem('needsSubscription') === 'true';
  
  const handleLogout = () => {
    // Prima eseguiamo il dispatch dell'azione logout
    dispatch(logout());
    
    // Puliamo lo stato persistente
    purgeStore().then(() => {
      // Reindirizzamento alla home page
      window.location.href = '/';
    });
  };
  
  // Se il componente è InstructorProfile, dovrebbe essere renderizzato all'interno di ProfessorDashboard
  if (component === InstructorProfile) {
    return (
      <ProfessorDashboard 
        results={[]} 
        onLogout={handleLogout} 
        needsSubscription={needsSub}
        hostEmail={email}
        isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
      />
    );
  }
  
  // Se il componente è StudentProfile, dovrebbe essere renderizzato all'interno di StudentDashboard
  if (component === StudentProfile) {
    return (
      <StudentDashboard 
        results={[]}
        studentEmail={email}
        onLogout={handleLogout}
      />
    );
  }
  
  // Se arriviamo qui, renderizziamo il componente direttamente
  return <Component 
    userEmail={email} 
    needsSubscription={needsSub} 
  />;
}

function App() {
  // Utilizziamo Redux per lo stato dell'autenticazione
  const auth = useAppSelector(selectAuth);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [sessionExpirationChecked, setSessionExpirationChecked] = useState(false);
  const [isQuizLiveMode, setIsQuizLiveMode] = useState(false);
  
  // Funzione per sincronizzare Redux con localStorage
  const syncAuthState = () => {
    if (typeof window !== 'undefined') {
      const isProfessorLS = localStorage.getItem('isProfessor') === 'true';
      const isStudentLS = localStorage.getItem('isStudent') === 'true';
      const isMasterAdminLS = localStorage.getItem('isMasterAdmin') === 'true';
      const isAuthenticatedLS = localStorage.getItem('isAuthenticated') === 'true';
      
      // Se localStorage ha dati di autenticazione ma Redux no, sincronizziamo
      if (isAuthenticatedLS && !auth.isAuthenticated) {
        console.log('Sincronizzazione da localStorage a Redux');
        dispatch(syncFromStorage());
      }
      
      // Se Redux ha dati di autenticazione ma localStorage no, sincronizziamo
      if (auth.isAuthenticated && !isAuthenticatedLS) {
        console.log('Sincronizzazione da Redux a localStorage');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('isProfessor', String(auth.isProfessor));
        localStorage.setItem('isStudent', String(auth.isStudent));
        localStorage.setItem('isMasterAdmin', String(auth.isMasterAdmin));
        localStorage.setItem('hasActiveAccess', String(auth.hasActiveAccess));
        localStorage.setItem('hasInstructorAccess', String(auth.hasInstructorAccess));
        localStorage.setItem('needsSubscription', String(auth.needsSubscription));
        if (auth.userEmail) localStorage.setItem('userEmail', auth.userEmail);
      }
      
      // Log per debug
      console.log('Stato auth corrente:', {
        reduxAuth: {
          isAuthenticated: auth.isAuthenticated,
          isProfessor: auth.isProfessor,
          isStudent: auth.isStudent,
          isMasterAdmin: auth.isMasterAdmin
        },
        localStorageAuth: {
          isAuthenticated: isAuthenticatedLS,
          isProfessor: isProfessorLS,
          isStudent: isStudentLS,
          isMasterAdmin: isMasterAdminLS
        }
      });
    }
  };
  
  // Eseguiamo la sincronizzazione iniziale
  useEffect(() => {
    syncAuthState();
    
    // Impostiamo un timer per controllare periodicamente la sincronizzazione
    const intervalId = setInterval(syncAuthState, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [auth.isAuthenticated]);

  // Funzione per ottenere il codice di accesso per un utente specifico
  const getAccessCodeForUser = async (userEmail: string): Promise<string | null> => {
    try {
      // Cerca se l'utente ha un codice attivo
      const { data: accessCodes, error } = await supabase
        .from('instructor_profiles')
        .select('access_code')
        .eq('email', userEmail)
        .single();
      
      if (error) {
        console.error('Errore nel recupero del profilo istruttore:', error);
        return null;
      }
      
      if (accessCodes && accessCodes.access_code) {
        // Verifica se il codice di accesso è attivo
        const { data, error: codeError } = await supabase
          .from('access_codes')
          .select('code, is_active')
          .eq('code', accessCodes.access_code)
          .single();
        
        if (codeError) {
          console.error('Errore nel recupero del codice di accesso:', codeError);
          return null;
        }
        
        if (data && data.is_active) {
          console.log(`Codice di accesso trovato e attivo: ${data.code}`);
          
          // Aggiorniamo tutti i flag di accesso
          localStorage.setItem('hasActiveAccess', 'true');
          localStorage.setItem('hasInstructorAccess', 'true');
          localStorage.setItem('needsSubscription', 'false');
          localStorage.setItem('masterCode', data.code);
          
          return (data as { code: string }).code;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Errore nel recupero del codice di accesso:', error);
      return null;
    }
  };

  useEffect(() => {
    // Initialize user role from localStorage
    const isProfessor = localStorage.getItem('isProfessor') === 'true';
    const isStudent = localStorage.getItem('isStudent') === 'true';
    const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
    const hasInstructorAccess = localStorage.getItem('hasInstructorAccess') === 'true';
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const email = localStorage.getItem('userEmail') || localStorage.getItem('email') || '';
    
    // Caso speciale per marcosrenatobruno@gmail.com (ADMIN)
    if (email === 'marcosrenatobruno@gmail.com' && isAuthenticated) {
      // Assicuriamoci di avere tutti i flag necessari
      localStorage.setItem('hasActiveAccess', 'true');
      localStorage.setItem('hasInstructorAccess', 'true');
      localStorage.setItem('isMasterAdmin', 'true');
      localStorage.setItem('needsSubscription', 'false');
      localStorage.setItem('isProfessor', 'true');
      
      dispatch(login({
        isStudent: false,
        isProfessor: true,
        firstName: localStorage.getItem('firstName') || '',
        lastName: localStorage.getItem('lastName') || '',
        email: email,
        hasActiveAccess: true,
        hasInstructorAccess: true,
        isMasterAdmin: true,
        needsSubscription: false
      }));
      return;
    }

    if (isAuthenticated) {
      // Per gli istruttori, hasActiveAccess e hasInstructorAccess dovrebbero essere sincronizzati
      if (isProfessor && hasActiveAccess) {
        localStorage.setItem('hasInstructorAccess', 'true');
      }
      
      dispatch(login({
        isStudent,
        isProfessor,
        firstName: localStorage.getItem('firstName') || '',
        lastName: localStorage.getItem('lastName') || '',
        email: email,
        hasActiveAccess,
        hasInstructorAccess: isProfessor ? hasActiveAccess : false,
        needsSubscription: isProfessor ? !hasActiveAccess : !hasActiveAccess
      }));
    }
  }, []);

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const isStudent = localStorage.getItem('isStudent') === 'true';
      const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
      const hasInstructorAccess = localStorage.getItem('hasInstructorAccess') === 'true';
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      const email = localStorage.getItem('userEmail') || localStorage.getItem('email') || '';

      // Caso speciale per marcosrenatobruno@gmail.com (ADMIN)
      if (email === 'marcosrenatobruno@gmail.com' && isAuthenticated) {
        // Assicuriamoci di avere tutti i flag necessari
        localStorage.setItem('hasActiveAccess', 'true');
        localStorage.setItem('hasInstructorAccess', 'true');
        localStorage.setItem('isMasterAdmin', 'true');
        localStorage.setItem('needsSubscription', 'false');
        localStorage.setItem('isProfessor', 'true');
        
        dispatch(login({
          isStudent: false,
          isProfessor: true,
          firstName: localStorage.getItem('firstName') || '',
          lastName: localStorage.getItem('lastName') || '',
          email: email,
          hasActiveAccess: true,
          hasInstructorAccess: true,
          isMasterAdmin: true,
          needsSubscription: false
        }));
        return;
      }

      if (isAuthenticated) {
        // Per gli istruttori, hasActiveAccess e hasInstructorAccess dovrebbero essere sincronizzati
        if (isProfessor && hasActiveAccess) {
          localStorage.setItem('hasInstructorAccess', 'true');
        }
        
        dispatch(login({
          isStudent,
          isProfessor,
          firstName: localStorage.getItem('firstName') || '',
          lastName: localStorage.getItem('lastName') || '',
          email: email,
          hasActiveAccess,
          hasInstructorAccess: isProfessor ? hasActiveAccess : false,
          needsSubscription: isProfessor ? !hasActiveAccess : !hasActiveAccess
        }));
      } else {
        dispatch(logout());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdated', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    // Load quiz results if user is logged in
    if (auth.isStudent || auth.isProfessor) {
      loadQuizResults();
    }
  }, [auth.isStudent, auth.isProfessor, auth.userEmail]);

  const loadQuizResults = async () => {
    try {
      // Se l'utente è uno studente, passa la sua email per filtrare i risultati
      const email = auth.isStudent ? auth.userEmail : undefined;
      // @ts-ignore
      const results = await getQuizResults(email);
      setResults(results);
    } catch (error) {
      console.error('Error loading quiz results:', error);
      setResults([]);
    }
  };

  const handleLogout = () => {
    // Prima eseguiamo il dispatch dell'azione logout
    dispatch(logout());
    
    // Puliamo lo stato persistente
    purgeStore().then(() => {
      // Reindirizzamento alla home page
      window.location.href = '/';
    });
  };

  // Eseguiamo lo script all'avvio dell'applicazione
  if (typeof window !== 'undefined') {
    console.log('Avvio configurazione storage...');
    setupAllStorage().then(result => {
      console.log('Configurazione storage completata:', result);
    }).catch(error => {
      console.error('Errore durante la configurazione dello storage:', error);
    });
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <RouteListener />
        <div className="App">
          {/* Toaster per le notifiche */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 2000,
              style: {
                background: '#333',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
          <div className="min-h-screen antialiased">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login-demo" element={<LoginDemo />} />
              
              {/* Auth routes */}
              <Route
                path="/login"
                element={
                  !auth.isStudent && !auth.isProfessor ? (
                    <AuthScreen mode="student" />
                  ) : (
                    <Navigate to="/dashboard" />
                  )
                }
              />
              
              <Route
                path="/login-instructor"
                element={
                  !auth.isStudent && !auth.isProfessor ? (
                    <AuthScreen mode="instructor" />
                  ) : (
                    <Navigate to="/dashboard" />
                  )
                }
              />
              
              <Route
                path="/register"
                element={
                  !auth.isStudent && !auth.isProfessor ? (
                    <RegistrationPage />
                  ) : (
                    <Navigate to="/dashboard" />
                  )
                }
              />
              
              {/* Quiz Live routes - Sistema esistente */}
              <Route path="/quiz-live" element={<QuizLiveLayout />}>
                <Route index element={
                  auth.isProfessor 
                    ? <QuizLive hostEmail={auth.userEmail || ''} />
                    : <Navigate to="/quiz-live/join" />
                } />
                <Route path="join" element={<QuizJoin />} />
                <Route path="join/:pin" element={<QuizJoin />} />
                <Route path="waiting/:id" element={
                  localStorage.getItem('nickname') || auth.isProfessor 
                    ? <QuizWaiting />
                    : <Navigate to="/quiz-live/join" />
                } />
                <Route path="play/:id" element={
                  (localStorage.getItem('nickname') && localStorage.getItem('quizId')) || auth.isProfessor
                    ? <QuizPlay />
                    : <Navigate to="/quiz-live/join" />
                } />
                <Route path="leaderboard/:id" element={<QuizLeaderboard />} />
              </Route>
              
              {/* Protected dashboard route */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute 
                    element={
                      auth.isProfessor ? (
                        <ProfessorDashboard 
                          results={results} 
                          onLogout={handleLogout} 
                          needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                          hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                          isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                        />
                      ) : auth.userEmail || localStorage.getItem('userEmail') ? (
                        <StudentDashboard 
                          results={results.filter(r => r.email === (auth.userEmail || localStorage.getItem('userEmail')))}
                          studentEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                          onLogout={handleLogout}
                        />
                      ) : (
                        <Navigate to="/login" />
                      )
                    }
                  />
                }
              />
              
              {/* Profili accessibili anche senza autenticazione */}
              <Route path="/profile/student" element={<ProfileWrapper component={StudentProfile} />} />
              <Route path="/profile/instructor" element={<ProfileWrapper component={InstructorProfile} />} />
              
              {/* Rotte protette - Studente */}
              <Route
                path="/student-quiz"
                element={
                  <ProtectedRoute
                    element={
                      <StudentDashboard 
                        studentEmail={auth.userEmail || localStorage.getItem('userEmail') || ''} 
                        results={results.filter(r => r.email === (auth.userEmail || localStorage.getItem('userEmail')))} 
                        onLogout={handleLogout} 
                      />
                    }
                    requiredRole="student"
                  />
                }
              />
              
              <Route
                path="/quiz-history"
                element={
                  <ProtectedRoute
                    element={
                      <StudentDashboard 
                        studentEmail={auth.userEmail || localStorage.getItem('userEmail') || ''} 
                        results={results.filter(r => r.email === (auth.userEmail || localStorage.getItem('userEmail')))} 
                        onLogout={handleLogout} 
                      />
                    }
                    requiredRole="student"
                  />
                }
              />
              
              <Route
                path="/student-access-codes"
                element={
                  <ProtectedRoute
                    element={
                      <StudentDashboard 
                        studentEmail={auth.userEmail || localStorage.getItem('userEmail') || ''} 
                        results={results.filter(r => r.email === (auth.userEmail || localStorage.getItem('userEmail')))} 
                        onLogout={handleLogout} 
                      />
                    }
                    requiredRole="student"
                  />
                }
              />
              
              {/* Rotta protetta - Video per studenti */}
              <Route
                path="/my-videos"
                element={
                  <ProtectedRoute
                    element={<MyVideosPage />}
                    requiredRole="student"
                  />
                }
              />
              
              {/* Rotte protette - Admin/Istruttore */}
              <Route
                path="/admin/*"
                element={
                  auth.isProfessor ? (
                    <ProfessorDashboard 
                      results={results} 
                      onLogout={handleLogout} 
                      needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess}
                      hostEmail={auth.userEmail || ''}
                      isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                    />
                  ) : (
                    <Navigate to="/login" />
                  )
                }
              />
              
              {/* Rotta specifica per gestione quiz */}
              <Route
                path="/gestione-quiz"
                element={
                  <ProtectedRoute
                    element={
                      <ProfessorDashboard 
                        results={results} 
                        onLogout={handleLogout} 
                        needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                        hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                        isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                      />
                    }
                    requiredRole="professor"
                  />
                }
              />
              
              {/* Rotta specifica per gestione alunni */}
              <Route
                path="/gestione-alunni"
                element={
                  <ProtectedRoute
                    element={
                      <ProfessorDashboard 
                        results={results} 
                        onLogout={handleLogout} 
                        needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                        hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                        isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                      />
                    }
                    requiredRole="professor"
                  />
                }
              />
              
              {/* Rotta specifica per codici di accesso istruttore */}
              <Route
                path="/instructor-access-codes"
                element={
                  <ProtectedRoute
                    element={
                      <ProfessorDashboard 
                        results={results} 
                        onLogout={handleLogout} 
                        needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                        hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                        isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                      />
                    }
                    requiredRole="professor"
                  />
                }
              />
              
              {/* Rotta specifica per codici PRO */}
              <Route
                path="/pro-codes"
                element={
                  <ProtectedRoute
                    element={
                      <ProfessorDashboard 
                        results={results} 
                        onLogout={handleLogout} 
                        needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                        hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                        isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                      />
                    }
                    requiredRole="professor"
                  />
                }
              />
              
              {/* Rotta specifica per quiz studenti */}
              <Route
                path="/quiz-studenti"
                element={
                  <ProtectedRoute
                    element={
                      <ProfessorDashboard 
                        results={results} 
                        onLogout={handleLogout} 
                        needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                        hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                        isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                      />
                    }
                    requiredRole="professor"
                  />
                }
              />
              
              {/* Rotta per i quiz (gestisce sia studenti che istruttori) */}
              <Route
                path="/quizzes"
                element={
                  <ProtectedRoute
                    element={
                      auth.isProfessor ? (
                        <ProfessorDashboard 
                          results={results} 
                          onLogout={handleLogout} 
                          needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                          hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                          isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                        />
                      ) : (
                        <StudentDashboard 
                          results={results.filter(r => r.email === (auth.userEmail || localStorage.getItem('userEmail')))}
                          studentEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                          onLogout={handleLogout}
                        />
                      )
                    }
                  />
                }
              />
              
              {/* Rotta specifica per video didattici */}
              <Route
                path="/videos"
                element={
                  <ProtectedRoute
                    element={
                      <ProfessorDashboard 
                        results={results} 
                        onLogout={handleLogout} 
                        needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                        hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                        isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                      />
                    }
                    requiredRole="professor"
                  />
                }
              />
              
              {/* Rotta per gestire le notifiche */}
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute
                    element={
                      auth.isProfessor ? (
                        <ProfessorDashboard 
                          results={results} 
                          onLogout={handleLogout} 
                          needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                          hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                          isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                        />
                      ) : (
                        <StudentDashboard 
                          results={results.filter(r => r.email === (auth.userEmail || localStorage.getItem('userEmail')))}
                          studentEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                          onLogout={handleLogout}
                        />
                      )
                    }
                  />
                }
              />
              
              {/* Rotta per gestione utenti (solo admin) */}
              <Route
                path="/students"
                element={
                  <ProtectedRoute
                    element={
                      <ProfessorDashboard 
                        results={results} 
                        onLogout={handleLogout} 
                        needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                        hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                        isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                      />
                    }
                    requiredRole="professor"
                  />
                }
              />
              
              {/* Rotta per gestione abbonamenti (solo admin) */}
              <Route
                path="/subscriptions"
                element={
                  <ProtectedRoute
                    element={
                      <ProfessorDashboard 
                        results={results} 
                        onLogout={handleLogout} 
                        needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                        hostEmail={auth.userEmail || localStorage.getItem('userEmail') || ''}
                        isMaster={auth.isMasterAdmin || localStorage.getItem('isMasterAdmin') === 'true'}
                      />
                    }
                    requiredRole="professor"
                  />
                }
              />
              
              {/* Test Quiz Route */}
              <Route path="/test-quiz/:quizType/:quizId" element={<TestQuizPage />} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
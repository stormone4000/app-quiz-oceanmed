import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';
import { ProfessorDashboard } from './components/ProfessorDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { PricingPage } from './components/pricing/PricingPage';
import { RegistrationPage } from './components/registration/RegistrationPage';
import { QuizLiveLayout } from './components/interactive/QuizLiveLayout';
import { QuizJoin } from './components/interactive/QuizJoin';
import { QuizWaiting } from './components/interactive/QuizWaiting';
import { QuizPlay } from './components/interactive/QuizPlay';
import { QuizLive } from './components/interactive/QuizLive';
import { QuizLeaderboard } from './components/interactive/QuizLeaderboard';
import { getQuizResults } from './services/api';
import type { UserRole, QuizResult } from './types';
import { supabase } from './services/supabase';
import { ThemeProvider } from './components/theme-provider';
import { LoginDemo } from './components/auth/LoginDemo';

function App() {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const storedEmail = localStorage.getItem('userEmail');
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
      const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
      const lastPath = sessionStorage.getItem('lastPath');
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      
      console.log('[App] Verifica autenticazione:', { isAuthenticated, storedEmail, isProfessor });
      
      // Verifica se l'utente è effettivamente autenticato
      if (!isAuthenticated) {
        console.log('[App] Utente non autenticato');
        // Puliamo completamente i dati utente in caso di mancata autenticazione
        localStorage.removeItem('userEmail');
        localStorage.removeItem('isProfessor');
        localStorage.removeItem('isMasterAdmin');
        localStorage.removeItem('hasActiveAccess');
        return {
          isStudent: false,
          isProfessor: false
        };
      }
      
      // If user is already logged in as professor
      if (isProfessor) {
        // Check if access is active
        if (!hasActiveAccess && !isMasterAdmin) {
          return {
            isStudent: false,
            isProfessor: true,
            needsSubscription: true,
            email: storedEmail || ''
          };
        }
        
        return {
          isStudent: false,
          isProfessor: true,
          isMasterAdmin: isMasterAdmin,
          hasActiveAccess: hasActiveAccess,
          email: storedEmail || ''
        };
      }
      
      // If user is already logged in as student
      if (storedEmail) {
        return {
          isStudent: true,
          isProfessor: false,
          email: storedEmail
        };
      }
      
      return {
        isStudent: false,
        isProfessor: false
      };
    } catch (error) {
      console.error('Error initializing user role:', error);
      return {
        isStudent: false,
        isProfessor: false
      };
    }
  });

  // Funzione per ottenere il codice di accesso per un utente specifico
  const getAccessCodeForUser = async (userEmail: string): Promise<string | null> => {
    try {
      // Prima cerchiamo nella tabella access_code_usage
      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select('access_codes(code)')
        .eq('student_email', userEmail)
        .order('used_at', { ascending: false })
        .limit(1);
      
      if (!usageError && usageData && usageData.length > 0 && usageData[0].access_codes) {
        // Utilizziamo una type assertion più sicura
        const accessCodes = usageData[0].access_codes as unknown;
        if (typeof accessCodes === 'object' && accessCodes !== null && 'code' in accessCodes) {
          return (accessCodes as { code: string }).code;
        }
      }
      
      // Rimuoviamo il caso speciale per istruttore1@io.it
      // Non attiviamo automaticamente il codice master 55555
      return null;
    } catch (error) {
      console.error('Errore nel recupero del codice di accesso:', error);
      return null;
    }
  };

  useEffect(() => {
    // Rimuoviamo l'attivazione automatica del codice master per istruttore1@io.it
    // La funzione originale è stata rimossa per evitare l'attivazione automatica
    const forceCheckIstruttore1 = async () => {
      // Non eseguire più la verifica automatica per istruttore1@io.it
      console.log('Verifica automatica disattivata per istruttore1@io.it');
      return;
    };
    
    // Eseguiamo la verifica forzata immediatamente
    forceCheckIstruttore1();
  }, []);

  // Add storage event listener to update userRole when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('Storage change event fired');
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      const storedEmail = localStorage.getItem('userEmail');
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
      const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
      const isCodeDeactivated = localStorage.getItem('isCodeDeactivated') === 'true';
      const firstName = localStorage.getItem('firstName') || '';
      const lastName = localStorage.getItem('lastName') || '';
      
      console.log('Storage values:', { 
        isAuthenticated,
        storedEmail, 
        isProfessor, 
        hasActiveAccess, 
        isMasterAdmin,
        isCodeDeactivated,
        firstName,
        lastName
      });
      
      // Se non è autenticato, resetta lo stato dell'utente
      if (!isAuthenticated) {
        setUserRole({
          isStudent: false,
          isProfessor: false
        });
        return;
      }
      
      // Se è autenticato, aggiorna lo stato userRole in base ai valori nel localStorage
      if (isProfessor) {
        setUserRole({
          isStudent: false,
          isProfessor: true,
          firstName,
          lastName,
          email: storedEmail || '',
          hasActiveAccess,
          isMasterAdmin,
          needsSubscription: !hasActiveAccess && !isMasterAdmin
        });
      } else if (storedEmail) {
        setUserRole({
          isStudent: true,
          isProfessor: false,
          firstName,
          lastName,
          email: storedEmail
        });
      }
      
      // Caso speciale per istruttore1@io.it
      if (storedEmail === 'istruttore1@io.it') {
        console.log('Utente speciale istruttore1@io.it rilevato nell\'event listener');
        
        // Se il codice è stato disattivato, manteniamo lo stato di needsSubscription
        if (isCodeDeactivated) {
          console.log('Il codice per istruttore1@io.it è stato disattivato, manteniamo lo stato di needsSubscription');
          
          setUserRole({
            isStudent: false,
            isProfessor: true,
            needsSubscription: true,
            isMasterAdmin: false
          });
          
          return;
        }
        
        // Se l'utente ha accesso attivo, verifichiamo che sia coerente con lo stato del codice
        if (isProfessor && hasActiveAccess) {
          // Verifichiamo lo stato del codice nel database in modo asincrono
          const checkCodeStatus = async () => {
            try {
              // Otteniamo il codice di accesso dal database
              const accessCode = await getAccessCodeForUser(storedEmail);
              
              if (!accessCode) {
                console.warn('Nessun codice di accesso trovato per l\'utente');
                
                // Rimuoviamo i flag di accesso dal localStorage
                localStorage.removeItem('hasActiveAccess');
                localStorage.removeItem('isProfessor');
                localStorage.removeItem('isMasterAdmin');
                localStorage.removeItem('masterCode');
                
                // Impostiamo il flag needsSubscription a true
                localStorage.setItem('needsSubscription', 'true');
                localStorage.setItem('isCodeDeactivated', 'true');
                
                // Aggiorniamo lo stato
                setUserRole({
                  isStudent: false,
                  isProfessor: true,
                  needsSubscription: true,
                  isMasterAdmin: false
                });
                
                // Mostriamo un messaggio all'utente solo se non è già stato mostrato
                const alertShown = localStorage.getItem('alertShown') === 'true';
                if (!alertShown) {
                  setTimeout(() => {
                    alert('ATTENZIONE: Non è stato trovato alcun codice di accesso attivo per il tuo account. Contatta l\'amministratore.');
                    localStorage.setItem('alertShown', 'true');
                  }, 1000);
                }
                
                return;
              }
              
              const { data: codeData, error: codeError } = await supabase
                .from('access_codes')
                .select('*')
                .eq('code', accessCode)
                .single();
              
              if (codeError || !codeData || !codeData.is_active) {
                console.warn(`Il codice ${accessCode} non è attivo nel database, ma l'utente ha accesso attivo!`);
                
                // Rimuoviamo i flag di accesso dal localStorage
                localStorage.removeItem('hasActiveAccess');
                localStorage.removeItem('isProfessor');
                localStorage.removeItem('isMasterAdmin');
                localStorage.removeItem('masterCode');
                
                // Impostiamo il flag needsSubscription a true
                localStorage.setItem('needsSubscription', 'true');
                localStorage.setItem('isCodeDeactivated', 'true');
                
                // Aggiorniamo lo stato
                setUserRole({
                  isStudent: false,
                  isProfessor: true,
                  needsSubscription: true,
                  isMasterAdmin: false
                });
                
                // Mostriamo un messaggio all'utente solo se non è già stato mostrato
                const alertShown = localStorage.getItem('alertShown') === 'true';
                if (!alertShown) {
                  setTimeout(() => {
                    alert(`ATTENZIONE: Il tuo codice di accesso (${accessCode}) non è più attivo. Contatta l'amministratore.`);
                    localStorage.setItem('alertShown', 'true');
                  }, 1000);
                }
              } else {
                console.log(`Il codice ${accessCode} è attivo nel database, l'utente ha accesso corretto`);
                
                // Se il codice è attivo, rimuoviamo il flag alertShown e isCodeDeactivated
                localStorage.removeItem('alertShown');
                localStorage.removeItem('isCodeDeactivated');
                localStorage.removeItem('needsSubscription');
                
                // Ripristiniamo i flag di accesso
                localStorage.setItem('hasActiveAccess', 'true');
                localStorage.setItem('isProfessor', 'true');
                localStorage.setItem('masterCode', accessCode);
                
                // Aggiorniamo lo stato
                setUserRole({
                  isStudent: false,
                  isProfessor: true,
                  needsSubscription: false,
                  isMasterAdmin: false
                });
              }
            } catch (error) {
              console.error('Errore durante la verifica del codice:', error);
            }
          };
          
          // Eseguiamo la verifica
          checkCodeStatus();
        }
      }
      
      if (isProfessor) {
        if (!hasActiveAccess && !isMasterAdmin) {
          setUserRole({
            isStudent: false,
            isProfessor: true,
            needsSubscription: true,
            isMasterAdmin: false
          });
          return;
        }
        setUserRole({
          isStudent: false,
          isProfessor: true,
          isMasterAdmin: isMasterAdmin
        });
      } else if (storedEmail) {
        setUserRole({
          isStudent: true,
          isProfessor: false,
          email: storedEmail
        });
      } else {
        setUserRole({
          isStudent: false,
          isProfessor: false
        });
      }
    };

    // Verifica lo stato iniziale subito
    handleStorageChange();

    // Aggiungiamo l'event listener sia per il 'storage' che per il nostro evento personalizzato
    window.addEventListener('storage', handleStorageChange);
    
    // Aggiungiamo un event listener per un evento personalizzato
    window.addEventListener('localStorageUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdated', handleStorageChange);
    };
  }, []);

  // Check instructor access on mount and periodically
  useEffect(() => {
    const checkInstructorAccess = async () => {
      const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
      const needsSubscription = localStorage.getItem('needsSubscription') === 'true';
      const masterCode = localStorage.getItem('masterCode');
      const userEmail = localStorage.getItem('userEmail');
      
      console.log('Verifica accesso istruttore:', { 
        hasActiveAccess, 
        isProfessor, 
        isMasterAdmin, 
        needsSubscription,
        masterCode,
        userEmail 
      });
      
      // Rimuoviamo la verifica speciale per istruttore1@io.it
      // Il codice master 55555 non verrà più attivato automaticamente
      
      // Aggiorniamo lo stato in base ai valori nel localStorage
      setUserRole({
        isStudent: !isProfessor,
        isProfessor,
        needsSubscription,
        isMasterAdmin
      });
    };

    const handleNoAccess = (reason: string) => {
      localStorage.setItem('hasActiveAccess', 'false');
      localStorage.removeItem('isMasterAdmin');
      localStorage.removeItem('masterCode');

      const storedEmail = localStorage.getItem('userEmail');
      if (storedEmail) {
        try {
          setUserRole({
            isStudent: false,
            isProfessor: true,
            needsSubscription: true,
            email: storedEmail,
            isMasterAdmin: false
          });
        } catch (error) {
          console.error('Error updating user role:', error);
        }
      }
    };

    // Check access immediately and every 5 minutes
    checkInstructorAccess();
    const interval = setInterval(checkInstructorAccess, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userRole.needsSubscription]);
  const [results, setResults] = useState<QuizResult[]>([]);

  useEffect(() => {
    // Load quiz results if user is logged in
    if (userRole.isStudent || userRole.isProfessor) {
      loadQuizResults();
    }
  }, [userRole.isStudent, userRole.isProfessor, userRole.email]);

  const loadQuizResults = async () => {
    try {
      // Se l'utente è uno studente, passa la sua email per filtrare i risultati
      const email = userRole.isStudent ? userRole.email : undefined;
      const results = await getQuizResults(email);
      setResults(results);
    } catch (error) {
      console.error('Error loading quiz results:', error);
    }
  };

  const handleLogout = () => {
    try {
      // Prima rimuovo tutti i dati specifici dell'utente
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('isProfessor');
      localStorage.removeItem('isMasterAdmin');
      localStorage.removeItem('hasActiveAccess');
      localStorage.removeItem('masterCode');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      localStorage.removeItem('nickname');
      localStorage.removeItem('quizId');
      
      // Poi pulisco tutto il resto
      localStorage.clear(); 
      sessionStorage.clear();
      
      // Aggiorno l'UI
      setUserRole({
        isStudent: false,
        isProfessor: false
      });
      setResults([]); // Clear results on logout
      
      // Triggera un evento storage per forzare la sincronizzazione
      window.dispatchEvent(new Event('storage'));
      
      // Reindirizzo alla home page
      window.location.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // In caso di errore, forza un hard refresh
      window.location.href = '/';
    }
  };

  // Aggiungo un effetto per verificare lo stato di autenticazione all'avvio dell'app
  useEffect(() => {
    // Verifica se l'utente è autenticato
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    // Se non è autenticato, assicuriamoci che tutti i dati di autenticazione vengano rimossi
    if (!isAuthenticated) {
      console.log('[App] Pulizia dati utente non autenticato');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('isProfessor');
      localStorage.removeItem('isMasterAdmin');
      localStorage.removeItem('hasActiveAccess');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      
      // Aggiorniamo lo stato dell'utente
      setUserRole({
        isStudent: false,
        isProfessor: false
      });
    }
  }, []);

  useEffect(() => {
    // Funzione per sincronizzare userRole con localStorage
    const syncUserRoleWithLocalStorage = () => {
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      const storedEmail = localStorage.getItem('userEmail');
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
      const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
      const firstName = localStorage.getItem('firstName') || '';
      const lastName = localStorage.getItem('lastName') || '';
      
      console.log('[App] Sincronizzazione userRole con localStorage:', { 
        isAuthenticated,
        storedEmail, 
        isProfessor, 
        hasActiveAccess, 
        isMasterAdmin,
        firstName,
        lastName
      });
      
      if (!isAuthenticated) {
        setUserRole({
          isStudent: false,
          isProfessor: false
        });
        return;
      }
      
      if (isProfessor) {
        setUserRole({
          isStudent: false,
          isProfessor: true,
          firstName,
          lastName,
          email: storedEmail || '',
          hasActiveAccess,
          isMasterAdmin,
          needsSubscription: !hasActiveAccess && !isMasterAdmin
        });
      } else if (storedEmail) {
        setUserRole({
          isStudent: true,
          isProfessor: false,
          firstName,
          lastName,
          email: storedEmail
        });
      }
    };
    
    // Sincronizza lo stato subito all'avvio dell'app
    syncUserRoleWithLocalStorage();
    
    // Aggiungi event listener per gli eventi di storage
    const handleStorageEvent = () => {
      console.log('[App] Storage event detected');
      syncUserRoleWithLocalStorage();
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    // Imposta un timer per verificare periodicamente lo stato di autenticazione
    const intervalId = setInterval(syncUserRoleWithLocalStorage, 30000);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <div className="min-h-screen bg-white dark:bg-slate-950">
          <Routes>
            {/* Landing page route */}
            <Route 
              path="/" 
              element={<LandingPage />}
              handle={{ title: 'Home' }}
            />

            {/* Login Demo route */}
            <Route path="/login-demo" element={<LoginDemo />} />

            {/* Auth routes */}
            <Route 
              path="/login" 
              element={
                !userRole.isStudent && !userRole.isProfessor ? (
                  <AuthScreen onRoleSelect={setUserRole} mode="student" />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />

            <Route 
              path="/instructor" 
              element={
                !userRole.isStudent && !userRole.isProfessor ? (
                  <AuthScreen onRoleSelect={setUserRole} mode="instructor" />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            
            <Route 
              path="/register" 
              element={
                !userRole.isStudent && !userRole.isProfessor ? (
                  <RegistrationPage />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            
            {/* Quiz Live routes */}
            <Route path="/quiz-live" element={<QuizLiveLayout />}>
              <Route index element={
                userRole.isProfessor 
                  ? <QuizLive hostEmail={userRole.email || ''} />
                  : <Navigate to="/quiz-live/join" replace />
              } />
              <Route path="join" element={<QuizJoin />} />
              <Route path="join/:pin" element={<QuizJoin />} />
              <Route path="waiting/:id" element={
                localStorage.getItem('nickname') || userRole.isProfessor 
                  ? <QuizWaiting />
                  : <Navigate to="/quiz-live/join" replace />
              } />
              <Route path="play/:id" element={
                (localStorage.getItem('nickname') && localStorage.getItem('quizId')) || userRole.isProfessor
                  ? <QuizPlay />
                  : <Navigate to="/quiz-live/join" replace />
              } />
              <Route path="leaderboard/:id" element={<QuizLeaderboard />} />
            </Route>

            {/* Protected dashboard route */}
            <Route 
              path="/dashboard" 
              element={
                localStorage.getItem('isAuthenticated') === 'true' ? (
                  localStorage.getItem('isProfessor') === 'true' ? (
                    <ProfessorDashboard 
                      results={results} 
                      onLogout={handleLogout} 
                      needsSubscription={localStorage.getItem('hasActiveAccess') !== 'true' && localStorage.getItem('isMasterAdmin') !== 'true'}
                      hostEmail={localStorage.getItem('userEmail') || ''}
                    />
                  ) : localStorage.getItem('userEmail') ? (
                    <StudentDashboard 
                      results={results.filter(r => r.email === localStorage.getItem('userEmail'))}
                      studentEmail={localStorage.getItem('userEmail') || ''}
                      onLogout={handleLogout}
                    />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
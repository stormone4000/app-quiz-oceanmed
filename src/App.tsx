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

// Creazione componenti wrapper per InstructorProfile e StudentProfile
function ProfileWrapper({component}: {component: React.ElementType}) {
  const auth = useAppSelector(selectAuth);
  const Component = component;
  return <Component userEmail={auth.userEmail || ''} needsSubscription={auth.needsSubscription} />;
}

function App() {
  // Utilizziamo Redux per lo stato dell'autenticazione
  const auth = useAppSelector(selectAuth);
  const dispatch = useAppDispatch();
  
  // Rimuoviamo lo stato locale userRole e usiamo direttamente auth da Redux
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(false);

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
    
    // Caso speciale per istruttore1@io.it
    if (email === 'istruttore1@io.it' && isAuthenticated) {
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

      // Caso speciale per istruttore1@io.it
      if (email === 'istruttore1@io.it' && isAuthenticated) {
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
      const results = await getQuizResults(email);
      setResults(results);
    } catch (error) {
      console.error('Error loading quiz results:', error);
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

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
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
            
            {/* Quiz Live routes */}
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
                auth.isAuthenticated ? (
                  auth.isProfessor ? (
                    <ProfessorDashboard 
                      results={results} 
                      onLogout={handleLogout} 
                      needsSubscription={!auth.hasActiveAccess && !auth.hasInstructorAccess && !auth.isMasterAdmin}
                      hostEmail={auth.userEmail || ''}
                    />
                  ) : auth.userEmail ? (
                    <StudentDashboard 
                      results={results.filter(r => r.email === auth.userEmail)}
                      studentEmail={auth.userEmail || ''}
                      onLogout={handleLogout}
                    />
                  ) : (
                    <Navigate to="/login" />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Profili accessibili anche senza autenticazione */}
            <Route path="/profile/student" element={<ProfileWrapper component={StudentProfile} />} />
            <Route path="/profile/instructor" element={<ProfileWrapper component={InstructorProfile} />} />
            
            {/* Rotte protette - Studente */}
            <Route
              path="/student/*"
              element={
                auth.isStudent ? (
                  <StudentDashboard 
                    studentEmail={auth.userEmail || ''} 
                    results={[]} 
                    onLogout={handleLogout} 
                  />
                ) : (
                  <Navigate to="/login" />
                )
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
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Test Quiz Route */}
            <Route path="/test-quiz/:quizType/:quizId" element={<TestQuizPage />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
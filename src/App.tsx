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

function App() {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const storedEmail = localStorage.getItem('userEmail');
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
      const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
      const lastPath = sessionStorage.getItem('lastPath');
      
      // If user is already logged in as professor
      if (isProfessor) {
        // Check if access is active
        if (!hasActiveAccess && !isMasterAdmin) {
          return {
            isStudent: false,
            isProfessor: true,
            needsSubscription: true,
            isMasterAdmin: false
          };
        }
        // Restore last path if available
        if (lastPath && lastPath !== '/login' && lastPath !== '/register' && lastPath !== '/instructor') {
          window.history.replaceState(null, '', lastPath);
        }
        return {
          isStudent: false,
          isProfessor: true,
          isMasterAdmin: isMasterAdmin
        };
      }

      // If user is logged in as student
      if (storedEmail) {
        // Restore last path if available
        if (lastPath && lastPath !== '/login' && lastPath !== '/register' && lastPath !== '/instructor') {
          window.history.replaceState(null, '', lastPath);
        }
        return {
          isStudent: true,
          isProfessor: false,
          email: storedEmail
        };
      }
      
      // No valid login
      return {
        isStudent: false,
        isProfessor: false
      };
    } catch (error) {
      localStorage.clear();
      sessionStorage.clear();
      return {
        isStudent: false,
        isProfessor: false
      };
    }
  });

  // Add storage event listener to update userRole when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const storedEmail = localStorage.getItem('userEmail');
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
      
      if (isProfessor) {
        if (!hasActiveAccess) {
          setUserRole({
            isStudent: false,
            isProfessor: true,
            needsSubscription: true
          });
          return;
        }
        setUserRole({
          isStudent: false,
          isProfessor: true
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

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check instructor access on mount and periodically
  useEffect(() => {
    const checkInstructorAccess = async () => {
      const storedEmail = localStorage.getItem('userEmail');
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
      const masterCode = localStorage.getItem('masterCode');

      // Skip check for non-instructors, missing email, or master admins
      if (!isProfessor || !storedEmail || isMasterAdmin) {
        return;
      }

      try {
        // Get password hash from storage
        const passwordHash = localStorage.getItem('passwordHash');
        if (!passwordHash) {
          handleNoAccess('Credenziali non valide');
          return;
        }

        // Verify instructor credentials
        const { data: users, error: userError } = await supabase
          .rpc('verify_instructor_credentials', { 
            p_email: storedEmail, 
            p_password_hash: passwordHash, 
            p_master_code: masterCode || ''
          });

        if (userError) {
          console.error('Verification error:', userError);
          handleNoAccess('Errore durante la verifica delle credenziali');
          return;
        }

        if (!users || users.length === 0) {
          handleNoAccess('Utente non trovato');
          return;
        }

        const user = users[0];
        const hasActiveAccess = user.is_master || user.subscription_status === 'active';

        // Update local storage based on user status
        localStorage.setItem('hasActiveAccess', hasActiveAccess.toString());
        localStorage.setItem('isMasterAdmin', user.is_master.toString());

        // Only update user role if access status changed
        if (hasActiveAccess !== (localStorage.getItem('hasActiveAccess') === 'true')) {
          setUserRole(prev => ({
            isStudent: false,
            isProfessor: true,
            needsSubscription: !hasActiveAccess,
            isMasterAdmin: user.is_master
          }));
        }
      } catch (error) {
        console.error('Error checking instructor access:', error);
        handleNoAccess('Errore durante la verifica dell\'accesso');
      }
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
  }, [userRole.isStudent, userRole.isProfessor]);

  const loadQuizResults = async () => {
    try {
      const results = await getQuizResults();
      setResults(results);
    } catch (error) {
      console.error('Error loading quiz results:', error);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.clear(); // Clear all storage on logout
      sessionStorage.clear();
      setUserRole({
        isStudent: false,
        isProfessor: false
      });
      setResults([]); // Clear results on logout
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          {/* Landing page route */}
          <Route 
            path="/" 
            element={<LandingPage />}
            handle={{ title: 'Home' }}
          />

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
              userRole.isStudent ? (
                <StudentDashboard 
                  results={results.filter(r => r.email === userRole.email)}
                  studentEmail={userRole.email || ''}
                  onLogout={handleLogout}
                />
              ) : userRole.isStudent ? (
                <StudentDashboard 
                  results={results.filter(r => r.email === userRole.email)}
                  studentEmail={userRole.email || ''}
                  onLogout={handleLogout}
                />
              ) : userRole.isProfessor ? (
                <ProfessorDashboard 
                  results={results} 
                  onLogout={handleLogout} 
                  needsSubscription={userRole.needsSubscription}
                  hostEmail={userRole.email}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
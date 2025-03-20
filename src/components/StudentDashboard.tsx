import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from './layout/DashboardLayout';
import { QuizSelection } from './QuizSelection';
import { QuizCategories } from './QuizCategories';
import { Quiz } from './student/Quiz';
import { AssignedQuizzes } from './student/AssignedQuizzes';
import { AccessCodeHistory } from './student/AccessCodeHistory';
import { VideoLessons } from './student/VideoLessons';
import { UserProfile } from './profile/UserProfile';
import { StudentStats } from './student/StudentStats';
import { QuizHistory } from './student/QuizHistory';
import { StudentDashboardProfile } from './student/StudentProfile';
import { NotificationList } from './notifications/NotificationList';
import { StudentSubscription } from './student/StudentSubscription';
import { QuizLiveMain } from './interactive/QuizLiveMain';
import { QuizSelector } from './student/QuizSelector';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { selectUi, setActiveTab } from '../redux/slices/uiSlice';
import { useNavigation } from '../hooks/useNavigation';
import type { QuizType, QuizResult } from '../types';
import type { DashboardTab } from '../types-dashboard';
import { StudentProfile } from './profile/StudentProfile';

// Definisco il tipo per i tab
// type DashboardTab = 'stats' | 'quizzes' | 'student-quiz' | 'access-codes' | 'profile' | 'videos' | 'quiz-studenti' | 'notifications' | 'subscriptions' | 'students' | 'quiz-live' | 'dashboard' | 'gestione-quiz' | 'gestione-alunni' | 'quiz-history' | 'student-access-codes' | 'instructor-access-codes';

interface Props {
  results: QuizResult[];
  studentEmail: string;
  onLogout: () => void;
}

export function StudentDashboard({ results, studentEmail, onLogout }: Props) {
  const { activeTab } = useAppSelector(selectUi);
  const dispatch = useAppDispatch();
  const { navigateToTab } = useNavigation();
  const [quizType, setQuizType] = useState<QuizType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Gestione dei parametri URL per la navigazione diretta
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    
    // Mappa dei percorsi URL ai tab del dashboard
    const pathToTabMap: Record<string, DashboardTab> = {
      '/dashboard': 'dashboard',
      '/quizzes': 'quizzes',
      '/student-quiz': 'student-quiz',
      '/quiz-history': 'quiz-history',
      '/my-videos': 'my-videos',
      '/student-access-codes': 'student-access-codes',
      '/quiz-live': 'quiz-live',
      '/notifications': 'notifications',
      '/profile/student': 'profile'
    };
    
    const path = location.pathname;
    
    // Prima controlliamo se il percorso corrente è nella mappa
    if (pathToTabMap[path]) {
      console.log(`[StudentDashboard] URL corrente ${path} corrisponde al tab ${pathToTabMap[path]}`);
      dispatch(setActiveTab(pathToTabMap[path]));
      console.log(`[StudentDashboard] Tab impostato a ${pathToTabMap[path]} in base all'URL`);
    } 
    // Poi controlliamo i parametri di query
    else if (tab) {
      console.log(`[StudentDashboard] Parametro tab=${tab} trovato nell'URL`);
      dispatch(setActiveTab(tab as DashboardTab));
    }
    
    // Infine controlliamo lo stato della location (compatibilità)
    if (location.state && location.state.activeTab) {
      console.log(`[StudentDashboard] Trovato activeTab=${location.state.activeTab} nello stato location`);
      dispatch(setActiveTab(location.state.activeTab));
    }
  }, [location, dispatch]);

  // Monitoriamo i cambiamenti del tab attivo
  useEffect(() => {
    console.log("StudentDashboard - Active tab changed to:", activeTab);
    
    // Reset degli stati correlati quando cambia il tab
    if (activeTab !== 'quizzes' && activeTab !== 'quiz-studenti') {
      setQuizType(null);
      setSelectedCategory(null);
    }
  }, [activeTab]);

  // Funzione per tornare alla dashboard
  const handleBackToDashboard = () => {
    dispatch(setActiveTab('dashboard'));
    setQuizType(null);
    setSelectedCategory(null);
  };

  const renderContent = () => {
    if (activeTab === 'quiz-history') {
      console.log("Rendering quiz history...");
      return (
        <div className="space-y-6 px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">Cronologia Quiz</h2>
          <QuizHistory 
            results={results} 
            onBack={() => dispatch(setActiveTab('dashboard'))}
          />
        </div>
      );
    }

    if (activeTab === 'quiz-live') {
      return <QuizLiveMain 
        userEmail={studentEmail} 
        userRole="student" 
      />;
    }

    if (activeTab === 'notifications') {
      return <NotificationList studentEmail={studentEmail} />;
    }

    if (activeTab === 'subscriptions') {
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-light text-white mb-6">Il Tuo Abbonamento</h2>
          <div className="w-full">
            <StudentSubscription studentEmail={studentEmail} />
          </div>
        </div>
      );
    }

    if (activeTab === 'videos' || activeTab === 'my-videos') {
      console.log("Rendering video lessons...");
      return (
        <div className="space-y-6 px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">I Miei Video</h2>
          <VideoLessons />
        </div>
      );
    }

    if (activeTab === 'profile') {
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-light text-white mb-6">Profilo Utente</h2>
          <StudentProfile 
            userEmail={studentEmail}
          />
        </div>
      );
    }

    if (activeTab === 'student-access-codes' || activeTab === 'access-codes') {
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-light text-white mb-6">Cronologia Codici di Accesso</h2>
          <AccessCodeHistory studentEmail={studentEmail} />
        </div>
      );
    }

    if (activeTab === 'student-quiz') {
      return (
        <div className="space-y-6 px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">Quiz Assegnati</h2>
          <AssignedQuizzes studentEmail={studentEmail} />
        </div>
      );
    }

    if (activeTab === 'quiz-studenti') {
      if (!quizType) {
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6 px-4 sm:px-6 md:px-8">Quiz Interattivi</h2>
            <div className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
              <QuizSelector onQuizSelect={(quizId) => {
                setSelectedCategory(quizId);
                setQuizType('interactive');
              }} />
            </div>
          </div>
        );
      }

      if (!selectedCategory) {
        return (
          <QuizCategories
            type={quizType}
            onBack={() => setQuizType(null)}
            onSelectCategory={setSelectedCategory}
          />
        );
      }

      return (
        <Quiz
          quizId={selectedCategory}
          onBack={() => setSelectedCategory(null)}
          studentEmail={studentEmail || localStorage.getItem('userEmail') || ''}
        />
      );
    }

    if (activeTab === 'stats' || activeTab === 'dashboard') {
      return (
        <div className="space-y-6 px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">Le Tue Statistiche</h2>
          <StudentStats 
            results={results} 
            onBack={() => dispatch(setActiveTab('quizzes'))} 
          />
        </div>
      );
    }

    if (activeTab === 'quizzes') {
      if (selectedCategory) {
        return (
          <Quiz
            quizId={selectedCategory}
            onBack={() => setSelectedCategory(null)}
            studentEmail={studentEmail || localStorage.getItem('userEmail') || ''}
          />
        );
      }
      
      if (quizType) {
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
          <QuizSelection
            onSelectQuizType={(type) => setQuizType(type)}
            onShowDashboard={() => dispatch(setActiveTab('stats'))}
          />
          <div className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
            <QuizSelector onQuizSelect={(quizId) => {
              setSelectedCategory(quizId);
              setQuizType('learning');
            }} />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <DashboardLayout
      onLogout={onLogout}
      studentEmail={studentEmail}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
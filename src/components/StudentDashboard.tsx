import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from './layout/DashboardLayout';
import { QuizSelection } from './QuizSelection';
import { QuizCategories } from './QuizCategories';
import { Quiz } from './student/Quiz';
import { AssignedQuizzes } from './student/AssignedQuizzes';
import { AccessCodeHistory } from './student/AccessCodeHistory';
import { VideoLessons } from './student/VideoLessons';
import { UserProfile } from './profile/UserProfile';
import { StudentStats } from './student/StudentStats';
import { StudentProfile } from './student/StudentProfile';
import { NotificationList } from './notifications/NotificationList';
import { StudentSubscription } from './student/StudentSubscription';
import { QuizLiveMain } from './interactive/QuizLiveMain';
import { QuizSelector } from './student/QuizSelector';
import type { QuizType, QuizResult } from '../types';
import type { DashboardTab } from '../types-dashboard';

// Definisco il tipo per i tab
// type DashboardTab = 'stats' | 'quizzes' | 'student-quiz' | 'access-codes' | 'profile' | 'videos' | 'quiz-studenti' | 'notifications' | 'subscriptions' | 'students' | 'quiz-live' | 'dashboard' | 'gestione-quiz' | 'gestione-alunni' | 'quiz-history' | 'student-access-codes' | 'instructor-access-codes';

interface Props {
  results: QuizResult[];
  studentEmail: string;
  onLogout: () => void;
}

export function StudentDashboard({ results, studentEmail, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('stats');
  const [quizType, setQuizType] = useState<QuizType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Gestione dei parametri URL per la navigazione diretta
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab as DashboardTab);
    }
  }, [location]);

  // Funzione per tornare alla dashboard
  const handleBackToDashboard = () => {
    setActiveTab('stats');
    setQuizType(null);
    setSelectedCategory(null);
  };

  const renderContent = () => {
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

    if (activeTab === 'videos') {
      return <VideoLessons />;
    }

    if (activeTab === 'profile') {
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-light text-white mb-6">Profilo Utente</h2>
          <StudentProfile studentEmail={studentEmail} />
          <UserProfile 
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

    if (activeTab === 'quiz-history') {
      return (
        <div className="space-y-6">
          <h2 className="text-3xl font-semibold text-white mb-6">Cronologia Quiz</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
            <StudentStats 
              results={results} 
              onBack={() => setActiveTab('dashboard')}
              showFilters={true}
            />
          </div>
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
          <StudentProfile studentEmail={studentEmail} />
          <StudentStats 
            results={results} 
            onBack={() => setActiveTab('quizzes')} 
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
            onShowDashboard={() => setActiveTab('stats')}
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
      activeTab={activeTab}
      onTabChange={(tab: DashboardTab) => {
        setActiveTab(tab);
        setQuizType(null);
        setSelectedCategory(null);
      }}
      onLogout={onLogout}
      studentEmail={studentEmail}
    >
      {renderContent()}
    </DashboardLayout>
  );
}
import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Target, Users, ArrowLeft } from 'lucide-react';
import { Sidebar } from '../layout/Sidebar';

export function QuizLiveLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRoot = location.pathname === '/quiz-live';
  const isProfessor = localStorage.getItem('isProfessor') === 'true';
  const isQuizRoute = location.pathname.includes('/quiz-live/play/') || 
                      location.pathname.includes('/quiz-live/waiting/');
  const isJoinRoute = location.pathname.includes('/quiz-live/join');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userEmail = localStorage.getItem('userEmail') || '';
  const isMaster = localStorage.getItem('isMaster') === 'true';

  useEffect(() => {
    // If trying to access root quiz-live path and not a professor, redirect to join
    if (isRoot && !isProfessor && !isQuizRoute) {
      navigate('/quiz-live/join', { replace: true });
    }
  }, [isRoot, isProfessor]);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleTabChange = (tab: 'stats' | 'quizzes' | 'student-quiz' | 'access-codes' | 'profile' | 'videos' | 'quiz-studenti' | 'notifications' | 'subscriptions' | 'students' | 'quiz-live') => {
    if (tab === 'quiz-live') {
      navigate('/quiz-live');
    } else {
      navigate('/dashboard', { state: { activeTab: tab } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 dark:from-slate-900 dark:to-slate-950 flex">
      {/* Sidebar - mostrata solo se non siamo in una sessione di quiz attiva */}
      {!isQuizRoute && (
        <Sidebar
          activeTab="quiz-live"
          onTabChange={handleTabChange}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={handleLogout}
          studentEmail={userEmail}
          isMaster={isMaster}
        />
      )}

      <div className="flex-1">
        {/* Header - nascosto nella pagina di join e nelle sessioni di quiz attive */}
        <header className={`bg-white shadow-md ${isQuizRoute || isJoinRoute ? 'hidden' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                {!isRoot && (
                  <Link
                    to="/quiz-live"
                    className="text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-300 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Torna alla Home
                  </Link>
                )}
                {isProfessor && (
                  <div className="flex items-center gap-2">
                    <Target className="w-6 h-6 text-blue-600" />
                    <h1 className="text-xl font-bold dark:text-slate-900">Quiz Live</h1>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                {isProfessor && (
                  <Link
                    to="/dashboard"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Torna alla Dashboard
                  </Link>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className={`max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} transition-all duration-300`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Book, GraduationCap, Menu, X, ChevronLeft, ChevronRight, LogOut, Key, UserCircle, Video, Target, Bell, CreditCard, Users } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';

interface SidebarProps {
  activeTab: 'stats' | 'quizzes' | 'student-quiz' | 'access-codes' | 'profile' | 'videos' | 'quiz-studenti' | 'notifications' | 'subscriptions' | 'students' | 'quiz-live';
  onTabChange: (tab: 'stats' | 'quizzes' | 'student-quiz' | 'access-codes' | 'profile' | 'videos' | 'quiz-studenti' | 'notifications' | 'subscriptions' | 'students' | 'quiz-live') => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
  studentEmail?: string;
  isMaster?: boolean;
}

export function Sidebar({ activeTab, onTabChange, isSidebarOpen, onToggleSidebar, onLogout, studentEmail, isMaster }: SidebarProps) {
  const navigate = useNavigate();
  const isProfessor = localStorage.getItem('isProfessor') === 'true';
  const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';

  const menuItems = [
    { id: 'stats', icon: BarChart, label: 'Statistiche', showFor: 'all', path: null, requiresAccess: isProfessor },
    { id: 'quizzes', icon: Book, label: 'Tutti i Quiz', showFor: 'master', path: null },
    { id: 'quiz-live', icon: Target, label: 'Quiz Live', showFor: 'all', path: '/quiz-live', requiresAccess: isProfessor },
    { id: 'quiz-studenti', icon: Target, label: 'Quiz Studenti', showFor: 'all', path: null, requiresAccess: isProfessor },
    { id: 'videos', icon: Video, label: 'Video Lezioni', showFor: 'all', path: null, requiresAccess: isProfessor },
    { id: 'students', icon: Users, label: isMaster ? 'Gestione Utenti' : 'Gestione Studenti', showFor: 'master', path: null, requiresAccess: true, lockedMessage: 'Inserisci il codice master per gestire gli studenti' },
    { id: 'access-codes', icon: Key, label: 'Codici di Accesso', showFor: 'master', path: null, requiresAccess: true, lockedMessage: 'Inserisci il codice master per gestire i codici di accesso' },
    { id: 'subscriptions', icon: CreditCard, label: 'Abbonamenti', showFor: 'master', path: null, requiresAccess: true, lockedMessage: 'Inserisci il codice master per gestire gli abbonamenti' },
    { id: 'notifications', icon: Bell, label: 'Notifiche', showFor: 'all', path: null, requiresAccess: isProfessor },
    { id: 'profile', icon: UserCircle, label: 'Profilo', showFor: 'all', path: null }
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    item.showFor === 'all' || 
    (item.showFor === 'master' && isMaster)
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="bg-white p-3 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
          aria-label={isSidebarOpen ? 'Chiudi menu' : 'Apri menu'}
        >
          {isSidebarOpen ? (
            <X className="w-6 h-6 text-blue-600" />
          ) : (
            <Menu className="w-6 h-6 text-blue-600" />
          )}
        </button>
        {studentEmail && (
          <div className="bg-white p-2 rounded-lg shadow-lg">
            <NotificationBell 
              studentEmail={studentEmail} 
              onViewAll={() => onTabChange('notifications')}
            />
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-fullbg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg z-40 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 mb-6">
            <img
              src={isSidebarOpen 
                ? "https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img//logo-white.svg"
                : "https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img//pittogramma-white.svg"
              }
              alt="OceanMed Logo"
              className={`h-12 w-auto mx-auto transition-all duration-300 ${
                !isSidebarOpen ? 'lg:h-10' : ''
              }`}
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1">
            <div className={`${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
              {filteredMenuItems.map(({ id, icon: Icon, label, requiresAccess, lockedMessage }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (requiresAccess && !hasActiveAccess && !isMaster && isProfessor) {
                      onTabChange('profile');
                      return;
                    }
                    const menuItem = menuItems.find(item => item.id === id);
                    if (menuItem?.path) {
                      navigate(menuItem.path);
                    } else {
                      onTabChange(id as any);
                    }
                    if (window.innerWidth < 1024) onToggleSidebar();
                  }}
                  className={`w-full p-4 flex text-sm items-center gap-3 transition-colors ${
                    activeTab === id
                      ? 'bg-blue-50 text-blue-600'
                      : requiresAccess && !hasActiveAccess && !isMaster && isProfessor
                        ? 'text-gray-400 hover:bg-blue-800/20'
                        : 'text-white hover:bg-blue-800'
                  }`}
                  disabled={requiresAccess && !hasActiveAccess && !isMaster && isProfessor}
                  style={{ opacity: requiresAccess && !hasActiveAccess && !isMaster && isProfessor ? 0.5 : 1 }}
                  title={requiresAccess && !hasActiveAccess && !isMaster && isProfessor ? 'Inserisci il codice master per accedere' : ''}
                >
                  {id === 'notifications' && studentEmail ? (
                    <div className={`${!isSidebarOpen ? 'lg:mx-auto' : ''}`}>
                      <NotificationBell 
                        studentEmail={studentEmail} 
                        className={activeTab === id ? 'text-blue-600' : 'text-white'} 
                        onViewAll={() => onTabChange('notifications')}
                      />
                    </div>
                  ) : (
                    <Icon className={`w-6 h-4 flex-shrink-0 ${
                      !isSidebarOpen ? 'lg:mx-auto' : ''
                    }`} />
                  )}
                  <span className={`whitespace-nowrap transition-opacity duration-300 ${
                    !isSidebarOpen ? 'lg:hidden' : ''
                  }`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </nav>

          {/* Bottom Actions */}
          <div className="mt-auto border-t border-gray-200">
            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="w-full p-4 text-white hover:bg-blue-800 transition-colors flex items-center gap-3"
            >
              <LogOut className={`w-6 h-6 flex-shrink-0 ${
                !isSidebarOpen ? 'lg:mx-auto' : ''
              }`} />
              <span className={`whitespace-nowrap transition-opacity duration-300 ${
                !isSidebarOpen ? 'lg:hidden' : ''
              }`}>
                Esci
              </span>
            </button>

            {/* Toggle Button for Desktop */}
            <div className="hidden lg:block border-t border-gray-200">
              <button
                onClick={onToggleSidebar}
                className="w-full p-4 text-white hover:bg-blue-800 transition-colors flex items-center justify-center"
                aria-label={isSidebarOpen ? 'Comprimi menu' : 'Espandi menu'}
              >
                {isSidebarOpen ? (
                  <ChevronLeft className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
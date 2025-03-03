import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Book, GraduationCap, Menu, X, ChevronLeft, ChevronRight, LogOut, Key, UserCircle, Video, Target, Bell, CreditCard, Users, Home, PlusCircle, LayoutDashboard } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';

interface SidebarProps {
  activeTab: 'stats' | 'quizzes' | 'student-quiz' | 'access-codes' | 'profile' | 'videos' | 'quiz-studenti' | 'notifications' | 'subscriptions' | 'students' | 'quiz-live' | 'dashboard' | 'gestione-quiz' | 'gestione-alunni';
  onTabChange: (tab: 'stats' | 'quizzes' | 'student-quiz' | 'access-codes' | 'profile' | 'videos' | 'quiz-studenti' | 'notifications' | 'subscriptions' | 'students' | 'quiz-live' | 'dashboard' | 'gestione-quiz' | 'gestione-alunni') => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
  studentEmail?: string;
  isMaster?: boolean;
}

export function Sidebar({ activeTab, onTabChange, isSidebarOpen, onToggleSidebar, onLogout, studentEmail, isMaster }: SidebarProps) {
  const navigate = useNavigate();
  const [localIsProfessor, setLocalIsProfessor] = useState(localStorage.getItem('isProfessor') === 'true');
  const [localHasActiveAccess, setLocalHasActiveAccess] = useState(localStorage.getItem('hasActiveAccess') === 'true');
  const [localIsMaster, setLocalIsMaster] = useState(localStorage.getItem('isMasterAdmin') === 'true');
  const [isIstruttore1, setIsIstruttore1] = useState(localStorage.getItem('userEmail') === 'istruttore1@io.it');
  const [needsSubscription, setNeedsSubscription] = useState(localStorage.getItem('needsSubscription') === 'true');
  const [isCodeDeactivated, setIsCodeDeactivated] = useState(localStorage.getItem('isCodeDeactivated') === 'true');
  
  // Aggiorniamo gli stati locali quando cambia localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
      const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
      const userEmail = localStorage.getItem('userEmail');
      const needsSubscription = localStorage.getItem('needsSubscription') === 'true';
      const isCodeDeactivated = localStorage.getItem('isCodeDeactivated') === 'true';
      
      console.log('Sidebar - Storage change detected:', { 
        isProfessor, 
        hasActiveAccess, 
        isMasterAdmin, 
        userEmail,
        needsSubscription,
        isCodeDeactivated
      });
      
      setLocalIsProfessor(isProfessor);
      setLocalHasActiveAccess(hasActiveAccess);
      setLocalIsMaster(isMasterAdmin);
      setIsIstruttore1(userEmail === 'istruttore1@io.it');
      setNeedsSubscription(needsSubscription);
      setIsCodeDeactivated(isCodeDeactivated);
    };
    
    // Verifica i valori iniziali
    handleStorageChange();
    
    // Ascolta gli eventi di storage
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdated', handleStorageChange);
    };
  }, []);

  // Log delle props e degli stati per debugging
  console.log('Sidebar props:', { isMaster, activeTab });
  console.log('Sidebar local state:', { 
    localIsProfessor, 
    localHasActiveAccess, 
    localIsMaster, 
    isIstruttore1, 
    needsSubscription,
    isCodeDeactivated
  });

  // Voci di menu per l'amministratore
  const adminMenuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', showFor: 'all', path: null },
    { id: 'quizzes', icon: Book, label: 'Tutti i Quiz', showFor: 'all', path: null },
    { id: 'quiz-live', icon: Target, label: 'Quiz Live', showFor: 'all', path: '/quiz-live', requiresAccess: true },
    { id: 'students', icon: Users, label: 'Gestione Utenti', showFor: 'all', path: null, requiresAccess: true },
    { id: 'access-codes', icon: Key, label: 'Codici di Accesso', showFor: 'all', path: null, requiresAccess: true },
    { id: 'subscriptions', icon: CreditCard, label: 'Abbonamenti', showFor: 'all', path: null, requiresAccess: true },
    { id: 'notifications', icon: Bell, label: 'Notifiche', showFor: 'all', path: null, requiresAccess: true },
    { id: 'profile', icon: UserCircle, label: 'Profilo', showFor: 'all', path: null }
  ];

  // Voci di menu per l'istruttore
  const instructorMenuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', showFor: 'all', path: null, requiresAccess: true },
    { id: 'quizzes', icon: Book, label: 'Tutti i Quiz', showFor: 'all', path: null, requiresAccess: true },
    { id: 'gestione-quiz', icon: PlusCircle, label: 'Gestione Quiz', showFor: 'all', path: null, requiresAccess: true },
    { id: 'quiz-live', icon: Target, label: 'Quiz Interattivi', showFor: 'all', path: '/quiz-live', requiresAccess: true },
    { id: 'gestione-alunni', icon: Users, label: 'Gestione Alunni', showFor: 'all', path: null, requiresAccess: true },
    { id: 'stats', icon: BarChart, label: 'Statistiche', showFor: 'all', path: null, requiresAccess: true },
    { id: 'notifications', icon: Bell, label: 'Notifiche', showFor: 'all', path: null, requiresAccess: true },
    { id: 'profile', icon: UserCircle, label: 'Profilo', showFor: 'all', path: null }
  ];

  // Voci di menu per lo studente
  const studentMenuItems = [
    { id: 'dashboard', icon: Home, label: 'Home', showFor: 'all', path: null },
    { id: 'quiz-studenti', icon: Target, label: 'Quiz', showFor: 'all', path: null },
    { id: 'videos', icon: Video, label: 'Video Lezioni', showFor: 'all', path: null },
    { id: 'notifications', icon: Bell, label: 'Notifiche', showFor: 'all', path: null },
    { id: 'profile', icon: UserCircle, label: 'Profilo', showFor: 'all', path: null }
  ];

  // Seleziona il menu appropriato in base al ruolo dell'utente
  let menuItems = studentMenuItems;
  
  if (localIsMaster) {
    menuItems = adminMenuItems;
  } else if (localIsProfessor) {
    menuItems = instructorMenuItems;
  }

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    item.showFor === 'all' || 
    (item.showFor === 'master' && (isMaster || localIsMaster))
  );

  // Nel renderMenuItems, utilizziamo sia le props che gli stati locali
  const renderMenuItems = () => {
    return filteredMenuItems.map(({ id, icon: Icon, label, requiresAccess, lockedMessage }) => {
      // Caso speciale per istruttore1@io.it: se ha bisogno di sottoscrizione o il codice è disattivato,
      // disabilitiamo tutte le voci tranne il profilo
      const isProfileItem = id === 'profile';
      const shouldDisableForIstruttore1 = isIstruttore1 && (needsSubscription || isCodeDeactivated) && !isProfileItem;
      
      // Verifichiamo l'accesso usando sia le props che gli stati locali
      const hasAccess = (!requiresAccess || 
                        localHasActiveAccess || 
                        isMaster || 
                        localIsMaster || 
                        !localIsProfessor) && 
                        !shouldDisableForIstruttore1;
                        
      return (
        <button
          key={id}
          onClick={() => {
            if ((requiresAccess && !localHasActiveAccess && !isMaster && !localIsMaster && localIsProfessor) || 
                shouldDisableForIstruttore1) {
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
              : !hasAccess
                ? 'text-gray-400 hover:bg-blue-800/20'
                : 'text-white hover:bg-blue-800'
          }`}
          disabled={!hasAccess}
          style={{ opacity: hasAccess ? 1 : 0.5 }}
          title={!hasAccess ? (shouldDisableForIstruttore1 ? 'Inserisci il codice di attivazione per accedere' : (lockedMessage || 'Inserisci il codice master per accedere')) : ''}
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
      );
    });
  };

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
              {renderMenuItems()}
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
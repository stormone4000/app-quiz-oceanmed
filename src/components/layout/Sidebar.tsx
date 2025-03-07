import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, BookOpen, Users, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight, Layers, Award, User, Bell, BarChart, Key, Briefcase, BookCheck, UserCheck, Target } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { useTheme } from '../theme-provider';

type DashboardTab = 'stats' | 'quizzes' | 'student-quiz' | 'access-codes' | 'profile' | 'videos' | 'quiz-studenti' | 'notifications' | 'subscriptions' | 'students' | 'quiz-live' | 'dashboard' | 'gestione-quiz' | 'gestione-alunni' | 'quiz-history';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
  studentEmail?: string;
  isMaster?: boolean;
}

interface MenuItem {
  id: DashboardTab;
  icon: React.ElementType;
  label: string;
  showFor: 'admin' | 'instructor' | 'student' | 'all';
  path?: string;
  requiresAccess?: boolean;
  lockedMessage?: string;
}

export function Sidebar({ 
  activeTab, 
  onTabChange, 
  isSidebarOpen, 
  onToggleSidebar, 
  onLogout,
  studentEmail,
  isMaster
}: SidebarProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isProfessor, setIsProfessor] = useState(false);
  const [hasInstructorAccess, setHasInstructorAccess] = useState(false);
  const [localIsMaster, setLocalIsMaster] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCodeDeactivated, setIsCodeDeactivated] = useState(false);
  const [needsSubscription, setNeedsSubscription] = useState(false);

  useEffect(() => {
    // Inizializza gli stati locali dai valori in localStorage
    const updateFromLocalStorage = () => {
      const isProfessorValue = localStorage.getItem('isProfessor') === 'true';
      const hasInstructorAccessValue = localStorage.getItem('hasInstructorAccess') === 'true';
      const hasActiveAccessValue = localStorage.getItem('hasActiveAccess') === 'true';
      const isMasterValue = localStorage.getItem('isMasterAdmin') === 'true';
      const userEmailValue = localStorage.getItem('userEmail');
      const isCodeDeactivatedValue = localStorage.getItem('isCodeDeactivated') === 'true';
      const needsSubscriptionValue = localStorage.getItem('needsSubscription') === 'true';

      // Sincronizziamo i flag per gli istruttori
      if (isProfessorValue && hasActiveAccessValue && !hasInstructorAccessValue) {
        localStorage.setItem('hasInstructorAccess', 'true');
        console.log('Sidebar - Sincronizzato hasInstructorAccess con hasActiveAccess');
      }

      setIsProfessor(isProfessorValue);
      setHasInstructorAccess(hasInstructorAccessValue || (isProfessorValue && hasActiveAccessValue));
      setLocalIsMaster(isMasterValue);
      setUserEmail(userEmailValue);
      setIsCodeDeactivated(isCodeDeactivatedValue);
      setNeedsSubscription(needsSubscriptionValue);
      
      console.log('Sidebar - Stato aggiornato da localStorage:', {
        isProfessor: isProfessorValue,
        hasInstructorAccess: hasInstructorAccessValue,
        hasActiveAccess: hasActiveAccessValue,
        isMaster: isMasterValue,
        userEmail: userEmailValue,
        isCodeDeactivated: isCodeDeactivatedValue,
        needsSubscription: needsSubscriptionValue
      });
    };

    // Aggiorna gli stati quando il componente viene montato
    updateFromLocalStorage();

    // Aggiorna gli stati quando localStorage cambia
    const handleStorageChange = () => {
      updateFromLocalStorage();
    };

    window.addEventListener('localStorageUpdated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('localStorageUpdated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      icon: Home,
      label: 'Dashboard',
      showFor: 'all',
    },
    {
      id: 'quizzes',
      icon: BookOpen,
      label: 'Quiz Disponibili',
      showFor: 'all',
    },
    {
      id: 'quiz-history',
      icon: BarChart,
      label: 'Cronologia Quiz',
      showFor: 'student',
    },
    {
      id: 'gestione-quiz',
      icon: Layers,
      label: 'Gestione Quiz',
      showFor: 'instructor',
      requiresAccess: true,
    },
    {
      id: 'gestione-alunni',
      icon: Users,
      label: 'Gestione Studenti',
      showFor: 'instructor',
      requiresAccess: true,
    },
    {
      id: 'access-codes',
      icon: Key,
      label: 'Codici di Accesso',
      showFor: 'instructor',
      requiresAccess: true,
    },
    {
      id: 'videos',
      icon: BookCheck,
      label: 'Video Didattici',
      showFor: 'instructor',
      requiresAccess: true,
    },
    {
      id: 'quiz-studenti',
      icon: Award,
      label: 'Quiz studenti',
      showFor: 'instructor',
      requiresAccess: true,
    },
    {
      id: 'quiz-live',
      icon: Target,
      label: 'Quiz Live',
      showFor: 'all',
    },
    {
      id: 'students',
      icon: UserCheck,
      label: 'Gestione Utenti',
      showFor: 'admin',
      requiresAccess: true,
    },
    {
      id: 'subscriptions',
      icon: Briefcase,
      label: 'Abbonamenti',
      showFor: 'admin',
      requiresAccess: true,
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifiche',
      showFor: 'all',
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profilo',
      showFor: 'all',
    },
  ];

  const renderMenuItems = () => {
    return menuItems.filter(item => {
      // Filtra in base al ruolo
      if (item.showFor === 'all') return true;
      if (item.showFor === 'admin' && (isMaster || localIsMaster)) return true;
      if (item.showFor === 'instructor' && isProfessor) return true;
      if (item.showFor === 'student' && !isProfessor && !localIsMaster) return true;
      return false;
    }).map(({ id, icon: Icon, label, requiresAccess, lockedMessage }) => {
      // Caso speciale per istruttore1@io.it
      const isIstruttore1 = userEmail === 'istruttore1@io.it';
      
      // Verifica se l'elemento dovrebbe essere disabilitato per istruttore1
      const shouldDisableForIstruttore1 = isIstruttore1 && 
                                         (isCodeDeactivated || needsSubscription) && 
                                         requiresAccess;
      
      // Verifica se l'utente è un istruttore senza accesso
      const isInstructorWithoutAccess = isProfessor && !hasInstructorAccess && !isIstruttore1;
      
      // Gli amministratori hanno sempre accesso a tutto
      const adminHasAccess = isMaster || localIsMaster;
      
      // Verifichiamo l'accesso usando sia le props che gli stati locali
      const hasAccess = adminHasAccess || // Gli admin hanno sempre accesso
                        (!requiresAccess || // Elementi che non richiedono accesso
                        hasInstructorAccess || // Istruttori con codice attivo
                        !isProfessor) && // Studenti
                        !shouldDisableForIstruttore1 && // Caso speciale istruttore1
                        !(isInstructorWithoutAccess && requiresAccess); // Istruttori senza codice attivo
      
      console.log(`Menu item ${id}:`, { 
        hasAccess, 
        adminHasAccess, 
        requiresAccess, 
        hasInstructorAccess, 
        isProfessor,
        shouldDisableForIstruttore1,
        isInstructorWithoutAccess,
        isIstruttore1
      });
                        
      return (
        <button
          key={id}
          onClick={() => {
            // Se è un admin, ha sempre accesso
            if (adminHasAccess) {
              const menuItem = menuItems.find(item => item.id === id);
              if (menuItem?.path) {
                navigate(menuItem.path);
              } else {
                onTabChange(id);
              }
              if (window.innerWidth < 1024) onToggleSidebar();
              return;
            }
            
            // Se è istruttore1@io.it, garantiamo sempre l'accesso
            if (isIstruttore1 && isProfessor) {
              console.log('Garantiamo accesso per istruttore1@io.it');
              localStorage.setItem('hasInstructorAccess', 'true');
              localStorage.setItem('masterCode', '392673');
              localStorage.setItem('hasActiveAccess', 'true');
              localStorage.setItem('isCodeDeactivated', 'false');
              localStorage.setItem('needsSubscription', 'false');
              
              // Forziamo un evento di storage per aggiornare tutti i componenti
              window.dispatchEvent(new Event('localStorageUpdated'));
              
              const menuItem = menuItems.find(item => item.id === id);
              if (menuItem?.path) {
                navigate(menuItem.path);
              } else {
                onTabChange(id);
              }
              if (window.innerWidth < 1024) onToggleSidebar();
              return;
            }
            
            // Se è un istruttore senza accesso o istruttore1 con problemi, reindirizza al profilo
            if ((requiresAccess && !hasInstructorAccess && isProfessor) || 
                shouldDisableForIstruttore1) {
              onTabChange('profile');
              return;
            }
            
            const menuItem = menuItems.find(item => item.id === id);
            if (menuItem?.path) {
              navigate(menuItem.path);
            } else {
              onTabChange(id);
            }
            if (window.innerWidth < 1024) onToggleSidebar();
          }}
          className={`w-full p-3 flex text-sm items-center gap-3 rounded-lg my-1 mx-2 transition-all ${
            activeTab === id
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium'
              : !hasAccess
                ? 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
          disabled={!hasAccess}
          style={{ opacity: hasAccess ? 1 : 0.5 }}
          title={!hasAccess ? (isInstructorWithoutAccess ? 'Inserisci il codice di attivazione per accedere' : (shouldDisableForIstruttore1 ? 'Inserisci il codice di attivazione per accedere' : (lockedMessage || 'Inserisci il codice master per accedere'))) : ''}
        >
          {id === 'notifications' && studentEmail ? (
            <div className={`${!isSidebarOpen ? 'lg:mx-auto' : ''}`}>
              <NotificationBell 
                studentEmail={studentEmail} 
                className={activeTab === id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'} 
                onViewAll={() => onTabChange('notifications')}
              />
            </div>
          ) : (
            <Icon className={`w-5 h-5 flex-shrink-0 ${
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
          className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          aria-label={isSidebarOpen ? 'Chiudi menu' : 'Apri menu'}
        >
          {isSidebarOpen ? (
            <X className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          ) : (
            <Menu className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          )}
        </button>
        {studentEmail && (
          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg">
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
        className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-lg z-40 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 mb-6">
            <img
              src={isSidebarOpen 
                ? `https://uqutbomzymeklyowfewp.supabase.co/storage/v1/object/public/img//${
                    theme === 'dark' ? 'logo-white.svg' : 'logo.svg'
                  }`
                : `https://uqutbomzymeklyowfewp.supabase.co/storage/v1/object/public/img//${
                    theme === 'dark' ? 'pittogramma-white.svg' : 'pittogramma.svg'
                  }`
              }
              alt="OceanMed Logo"
              className={`h-12 w-auto mx-auto transition-all duration-300 ${
                !isSidebarOpen ? 'lg:h-10' : ''
              }`}
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2">
            <div className={`${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
              {renderMenuItems()}
            </div>
          </nav>

          {/* Bottom Actions */}
          <div className="mt-auto border-t border-slate-200 dark:border-slate-700">
            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="w-full p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors flex items-center gap-3 rounded-lg my-1 mx-2"
            >
              <LogOut className={`w-5 h-5 flex-shrink-0 ${
                !isSidebarOpen ? 'lg:mx-auto' : ''
              }`} />
              <span className={`whitespace-nowrap transition-opacity duration-300 ${
                !isSidebarOpen ? 'lg:hidden' : ''
              }`}>
                Esci
              </span>
            </button>

            {/* Toggle Button for Desktop */}
            <div className="hidden lg:block border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={onToggleSidebar}
                className="w-full p-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-center rounded-lg my-1 mx-2"
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
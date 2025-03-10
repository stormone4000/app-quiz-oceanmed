import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, BookOpen, Users, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight, Layers, Award, User, Bell, BarChart, Key, Briefcase, BookCheck, UserCheck, Target } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { useTheme } from '../theme-provider';
import { DashboardTab, MenuItem } from '../../types-dashboard';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
  studentEmail?: string;
  isMaster?: boolean;
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
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(0);

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
      const profileImageUrlValue = localStorage.getItem('profileImageUrl');
      const businessNameValue = localStorage.getItem('businessName');

      // Verifichiamo se l'immagine del profilo è cambiata
      if (profileImageUrlValue !== profileImageUrl) {
        console.log('Immagine profilo aggiornata da:', profileImageUrl, 'a:', profileImageUrlValue);
        setProfileImageUrl(profileImageUrlValue);
        // Incrementiamo il key per forzare il re-render dell'immagine
        setImageKey(prev => prev + 1);
      }

      // Verifichiamo se il nome dell'attività è cambiato
      if (businessNameValue !== businessName) {
        console.log('Nome attività aggiornato da:', businessName, 'a:', businessNameValue);
        setBusinessName(businessNameValue);
      }

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
        needsSubscription: needsSubscriptionValue,
        profileImageUrl: profileImageUrlValue,
        businessName: businessNameValue
      });
    };

    // Aggiorna gli stati quando il componente viene montato
    updateFromLocalStorage();

    // Aggiorna gli stati quando localStorage cambia
    const handleStorageChange = () => {
      console.log('Evento storage rilevato in Sidebar - aggiornamento dati');
      updateFromLocalStorage();
    };

    window.addEventListener('localStorageUpdated', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    // Chiediamo esplicitamente un aggiornamento all'intervallo di 5 secondi per verificare cambiamenti
    const intervalId = setInterval(() => {
      const currentImageUrl = localStorage.getItem('profileImageUrl');
      const currentBusinessName = localStorage.getItem('businessName');
      
      if (currentImageUrl !== profileImageUrl || currentBusinessName !== businessName) {
        console.log('Immagine profilo o nome attività cambiati durante il polling: aggiornamento');
        updateFromLocalStorage();
      }
    }, 5000);

    return () => {
      window.removeEventListener('localStorageUpdated', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [profileImageUrl, businessName]);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      icon: Home,
      label: 'Dashboard',
      showFor: 'all',
    },
    {
      id: 'pro-codes',
      icon: Key,
      label: 'Codici PRO',
      showFor: 'admin',
      requiresAccess: true,
    },
    {
      id: 'quizzes',
      icon: BookOpen,
      label: 'Quiz Disponibili',
      showFor: 'all',
    },
    {
      id: 'student-quiz',
      icon: BookCheck,
      label: 'Quiz Assegnati',
      showFor: 'student',
    },
    {
      id: 'quiz-history',
      icon: BarChart,
      label: 'Cronologia Quiz',
      showFor: 'student',
    },
    {
      id: 'student-access-codes',
      icon: Key,
      label: 'Cronologia Codici',
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
      id: 'instructor-access-codes',
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
      if (userEmail === 'istruttore1@io.it') {
        console.log('Garantiamo accesso per istruttore1@io.it');
        
        // Generiamo un codice più significativo basato sull'email dell'utente
        const customCode = `PRO-${userEmail.split('@')[0].toUpperCase()}`;
        
        localStorage.setItem('hasInstructorAccess', 'true');
        localStorage.setItem('masterCode', customCode);
        localStorage.setItem('hasActiveAccess', 'true');
        localStorage.setItem('isMasterAdmin', 'true');
        localStorage.setItem('needsSubscription', 'false');
      }
      
      // Verifica se l'elemento dovrebbe essere disabilitato per istruttore1
      const isIstruttore1 = userEmail === 'istruttore1@io.it';
      
      // Verifica se l'utente è un istruttore senza accesso
      const isInstructorWithoutAccess = isProfessor && !hasInstructorAccess && !isIstruttore1;
      
      // Gli amministratori hanno sempre accesso a tutto
      const adminHasAccess = isMaster || localIsMaster;
      
      // Verifichiamo l'accesso usando sia le props che gli stati locali
      const hasAccess = adminHasAccess || // Gli admin hanno sempre accesso
                        (!isProfessor || // Studenti hanno sempre accesso
                        (!requiresAccess || // Elementi che non richiedono accesso
                        (isProfessor && hasInstructorAccess))); // Verifica più rigorosa per istruttori
                        
      console.log(`Menu item ${id}:`, { 
        hasAccess, 
        adminHasAccess, 
        requiresAccess, 
        hasInstructorAccess, 
        isProfessor,
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
                isInstructorWithoutAccess) {
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
          title={!hasAccess ? (isInstructorWithoutAccess ? 'Inserisci il codice di attivazione per accedere' : (lockedMessage || 'Inserisci il codice master per accedere')) : ''}
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
          {/* Logo o Immagine del Profilo */}
          <div className="p-4 mb-2">
            {profileImageUrl && isProfessor ? (
              // Se c'è un'immagine di profilo e l'utente è un istruttore, la usiamo
              <div className={`relative mx-auto transition-all duration-300 ${
                !isSidebarOpen ? 'lg:h-10 lg:w-10' : 'h-12 w-12'
              }`}>
                <img
                  key={imageKey}
                  src={`${profileImageUrl}?t=${imageKey}`}
                  alt="Profilo Istruttore"
                  className={`h-full w-full mx-auto transition-all duration-300 rounded-full object-cover border-2 border-blue-500 ${
                    !isSidebarOpen ? 'lg:h-10 lg:w-10' : 'h-12 w-12'
                  }`}
                  onError={(e) => {
                    console.error('Errore caricamento immagine profilo:', e);
                    // Se l'immagine non si carica, falliamo elegantemente al logo predefinito
                    e.currentTarget.style.display = 'none';
                    // e utilizziamo il logo predefinito attraverso gli elementi HTML successivi
                  }}
                />
                {/* Logo di fallback in caso di errore nell'immagine, nascosto normalmente */}
                <div className="hidden" id="fallbackLogo">
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
              </div>
            ) : (
              // Altrimenti, usiamo il logo predefinito
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
            )}
            
            {/* Nome dell'attività, mostrato solo se siamo istruttori e se esiste */}
            {isProfessor && businessName && isSidebarOpen && (
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate max-w-full">
                  {businessName}
                </p>
              </div>
            )}
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
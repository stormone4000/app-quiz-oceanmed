import { useNavigate } from 'react-router-dom';
import { DashboardTab } from '../types-dashboard';
import { useAppDispatch } from '../redux/hooks';
import { setActiveTab } from '../redux/slices/uiSlice';

export function useNavigation() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const navigateToTab = (tab: DashboardTab, options?: { replaceState?: boolean }) => {
    // 1. Aggiorna lo stato globale
    dispatch(setActiveTab(tab));
    
    // 2. Salva il tab attivo in localStorage per persistenza
    localStorage.setItem('activeTab', tab);
    
    // 3. Gestisci la navigazione basata sul tab
    const navigationOptions = { 
      state: { authenticated: true, activeTab: tab },
      replace: options?.replaceState
    };
    
    // Log migliorato con più dettagli
    console.log(`[useNavigation] Navigazione al tab: ${tab}`);
    console.log(`[useNavigation] Opzioni di navigazione:`, JSON.stringify(navigationOptions));
    console.log(`[useNavigation] Stato Redux aggiornato: activeTab = ${tab}`);
    
    try {
      let targetPath = '';
      
      switch (tab) {
        case 'dashboard':
          targetPath = '/dashboard';
          break;
        case 'quizzes':
          targetPath = '/quizzes';
          break;
        case 'student-quiz':
          targetPath = '/student-quiz';
          break;
        case 'quiz-history':
          targetPath = '/quiz-history';
          break;
        case 'my-videos':
          targetPath = '/my-videos';
          break;
        case 'videos':
          targetPath = '/videos';
          break;
        case 'student-access-codes':
          targetPath = '/student-access-codes';
          break;
        case 'instructor-access-codes':
          targetPath = '/instructor-access-codes';
          break;
        case 'profile':
          const isProfessor = localStorage.getItem('isProfessor') === 'true';
          targetPath = isProfessor ? '/profile/instructor' : '/profile/student';
          console.log(`[useNavigation] Navigazione al profilo: ${targetPath} per utente ${isProfessor ? 'istruttore' : 'studente'}`);
          break;
        case 'gestione-quiz':
          targetPath = '/gestione-quiz';
          break;
        case 'gestione-alunni':
          targetPath = '/gestione-alunni';
          break;
        case 'quiz-studenti':
          targetPath = '/quiz-studenti';
          break;
        case 'quiz-live':
          targetPath = '/quiz-live';
          break;
        case 'pro-codes':
          targetPath = '/pro-codes';
          break;
        case 'notifications':
          console.log('[useNavigation] Navigazione alle notifiche');
          targetPath = '/notifications';
          break;
        case 'subscriptions':
          targetPath = '/subscriptions';
          break;
        case 'students':
          targetPath = '/students';
          break;
        default:
          console.log(`[useNavigation] Navigazione a percorso predefinito /${tab}`);
          targetPath = `/${tab}`;
      }
      
      // Log prima della navigazione effettiva
      console.log(`[useNavigation] In corso: navigazione a ${targetPath}`);
      
      // Esegui la navigazione
      navigate(targetPath, navigationOptions);
      
      // Log di conferma dopo la navigazione
      console.log(`[useNavigation] ✅ Navigazione completata al percorso ${targetPath} per il tab ${tab}`);
    } catch (error) {
      console.error(`[useNavigation] ❌ ERRORE durante la navigazione al tab ${tab}:`, error);
      // Aggiungiamo dettagli specifici sull'errore
      if (error instanceof Error) {
        console.error(`[useNavigation] Dettaglio errore: ${error.message}`);
        console.error(`[useNavigation] Stack trace: ${error.stack}`);
      }
    }
  };
  
  return { navigateToTab };
} 
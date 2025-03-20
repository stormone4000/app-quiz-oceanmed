import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectUi, setActiveTab } from '../../redux/slices/uiSlice';
import { DashboardTab } from '../../types-dashboard';

/**
 * Componente che ascolta i cambiamenti di route e aggiorna Redux di conseguenza
 */
export function RouteListener() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { activeTab } = useAppSelector(selectUi);
  
  useEffect(() => {
    // Mappa che associa i percorsi URL ai tab
    const pathToTabMap: Record<string, DashboardTab> = {
      '/dashboard': 'dashboard',
      '/quizzes': 'quizzes',
      '/student-quiz': 'student-quiz',
      '/quiz-history': 'quiz-history',
      '/my-videos': 'my-videos',
      '/student-access-codes': 'student-access-codes',
      '/gestione-quiz': 'gestione-quiz',
      '/gestione-alunni': 'gestione-alunni',
      '/instructor-access-codes': 'instructor-access-codes',
      '/videos': 'videos',
      '/quiz-studenti': 'quiz-studenti',
      '/quiz-live': 'quiz-live',
      '/students': 'students',
      '/subscriptions': 'subscriptions',
      '/notifications': 'notifications',
      '/profile/instructor': 'profile',
      '/profile/student': 'profile'
    };
    
    // Estrai il percorso senza parametri di query
    const path = location.pathname;
    
    // Se il percorso è presente nella mappa, aggiorna il tab attivo in Redux
    if (pathToTabMap[path] && pathToTabMap[path] !== activeTab) {
      console.log(`RouteListener: URL changed to ${path}, updating activeTab to ${pathToTabMap[path]}`);
      dispatch(setActiveTab(pathToTabMap[path]));
    }
    
    // Se abbiamo uno stato con activeTab, usalo (per compatibilità)
    if (location.state && location.state.activeTab && location.state.activeTab !== activeTab) {
      console.log(`RouteListener: location.state has activeTab=${location.state.activeTab}`);
      dispatch(setActiveTab(location.state.activeTab));
    }
  }, [location, dispatch, activeTab]);
  
  // Questo componente non renderizza nulla
  return null;
} 
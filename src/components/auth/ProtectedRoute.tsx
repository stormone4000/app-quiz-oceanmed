import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { selectAuth, login } from '../../redux/slices/authSlice';

interface ProtectedRouteProps {
  element: React.ReactNode;
  requiredRole?: 'student' | 'professor' | 'any';
}

export function ProtectedRoute({ element, requiredRole = 'any' }: ProtectedRouteProps) {
  const auth = useAppSelector(selectAuth);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // Verificare se l'utente è autenticato in diversi modi
  const isAuthenticated = 
    auth.isAuthenticated || 
    (location.state && location.state.authenticated) || 
    localStorage.getItem('isAuthenticated') === 'true';
  
  // Verificare il ruolo dell'utente
  const isProfessor = auth.isProfessor || localStorage.getItem('isProfessor') === 'true';
  const isStudent = auth.isStudent || localStorage.getItem('isStudent') === 'true';
  
  // Controllo avanzato dei permessi
  const hasRequiredRole = 
    requiredRole === 'any' || 
    (requiredRole === 'professor' && isProfessor) || 
    (requiredRole === 'student' && isStudent);
  
  useEffect(() => {
    // Log per debugging
    console.log('ProtectedRoute - Verifica accesso:', {
      isAuthenticated,
      requiredRole,
      hasRequiredRole,
      isProfessor,
      isStudent,
      authState: auth.isAuthenticated,
      locationState: location.state,
      localStorage: localStorage.getItem('isAuthenticated'),
      userEmail: auth.userEmail || localStorage.getItem('userEmail')
    });
    
    // Sincronizziamo il Redux store con localStorage se necessario
    if (!auth.isAuthenticated && isAuthenticated) {
      console.log('Stato di autenticazione discordante, sincronizziamo Redux');
      
      const isProfessorValue = localStorage.getItem('isProfessor') === 'true';
      const isStudentValue = localStorage.getItem('isStudent') === 'true';
      const hasActiveAccessValue = localStorage.getItem('hasActiveAccess') === 'true';
      const hasInstructorAccessValue = localStorage.getItem('hasInstructorAccess') === 'true';
      const isMasterAdminValue = localStorage.getItem('isMasterAdmin') === 'true';
      const needsSubscriptionValue = localStorage.getItem('needsSubscription') === 'true';
      const userEmail = localStorage.getItem('userEmail') || '';
      const firstName = localStorage.getItem('firstName') || '';
      const lastName = localStorage.getItem('lastName') || '';
      
      // Dispatch dell'azione di login per sincronizzare lo stato
      dispatch(login({
        isStudent: isStudentValue,
        isProfessor: isProfessorValue,
        isMasterAdmin: isMasterAdminValue,
        hasActiveAccess: hasActiveAccessValue,
        hasInstructorAccess: hasInstructorAccessValue,
        needsSubscription: needsSubscriptionValue,
        email: userEmail,
        firstName: firstName,
        lastName: lastName
      }));
    }
  }, [auth.isAuthenticated, isAuthenticated, hasRequiredRole, requiredRole, location, dispatch]);
  
  // Se l'utente non è autenticato, reindirizzare al login
  if (!isAuthenticated) {
    console.log('Utente non autenticato, reindirizzamento al login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Se l'utente non ha il ruolo richiesto, reindirizzare al dashboard
  if (!hasRequiredRole) {
    console.log('Utente non ha il ruolo richiesto, reindirizzamento al dashboard');
    console.log('Dettagli:', {
      requiredRole, 
      isProfessor, 
      isStudent, 
      hasRequiredRole,
      isProfessorFromAuth: auth.isProfessor,
      isProfessorFromLocalStorage: localStorage.getItem('isProfessor') === 'true'
    });
    return <Navigate to="/dashboard" state={{ from: location, authenticated: true }} replace />;
  }
  
  // Se l'utente è autenticato e ha il ruolo richiesto, renderizzare il componente
  return <>{element}</>;
} 
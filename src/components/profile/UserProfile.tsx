import React, { useEffect } from 'react';
import { ProfileLayout } from './ProfileLayout';
import { useLocation } from 'react-router-dom';

interface UserProfileProps {
  userEmail: string;
  needsSubscription?: boolean;
}

export function UserProfile({ userEmail, needsSubscription }: UserProfileProps) {
  const isInstructor = localStorage.getItem('isProfessor') === 'true';
  const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
  const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
  const location = useLocation();
  
  // Aggiungiamo un log per debug
  useEffect(() => {
    console.log('UserProfile - Rendering profilo per:', {
      userEmail,
      isInstructor,
      isMasterAdmin,
      hasActiveAccess,
      needsSubscription,
      pathname: location.pathname
    });
    
    // Caso speciale per istruttore1@io.it
    if (userEmail === 'istruttore1@io.it' && isInstructor) {
      console.log('Garantiamo accesso per istruttore1@io.it');
      
      // Generiamo un codice più significativo basato sull'email dell'utente
      const customCode = `PRO-${userEmail.split('@')[0].toUpperCase()}`;
      
      localStorage.setItem('hasInstructorAccess', 'true');
      localStorage.setItem('masterCode', customCode);
      localStorage.setItem('hasActiveAccess', 'true');
      localStorage.setItem('isMasterAdmin', 'true');
      localStorage.setItem('needsSubscription', 'false');
      
      // Forziamo un evento di storage per aggiornare tutti i componenti
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('localStorageUpdated'));
    }
    
    // Sincronizziamo i flag per gli istruttori
    if (isInstructor && hasActiveAccess) {
      localStorage.setItem('hasInstructorAccess', 'true');
      
      // Forziamo un evento di storage per aggiornare tutti i componenti
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('localStorageUpdated'));
    }
  }, [userEmail, isInstructor, isMasterAdmin, hasActiveAccess, needsSubscription, location]);

  // Verifichiamo se siamo nella pagina del profilo "standalone"
  const isStandaloneProfile = location.pathname.includes('/profile/');
  
  // Se siamo nella pagina profile standalone, utilizziamo ProfileLayout
  if (isStandaloneProfile) {
    return (
      <ProfileLayout
        userEmail={userEmail}
        isInstructor={isInstructor}
        isMasterAdmin={isMasterAdmin}
        needsSubscription={needsSubscription}
      />
    );
  }
  
  // Altrimenti, non renderizziamo nulla (il profilo è gestito da StudentDashboard)
  // Questo è necessario per evitare di avere due visualizzazioni di profilo sovrapposte
  return null;
}
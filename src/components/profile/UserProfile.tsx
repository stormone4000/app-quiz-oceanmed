import React, { useEffect } from 'react';
import { ProfileLayout } from './ProfileLayout';

interface UserProfileProps {
  userEmail: string;
  needsSubscription?: boolean;
}

export function UserProfile({ userEmail, needsSubscription }: UserProfileProps) {
  const isInstructor = localStorage.getItem('isProfessor') === 'true';
  const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
  const hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
  
  // Aggiungiamo un log per debug
  useEffect(() => {
    console.log('UserProfile - Rendering profilo per:', {
      userEmail,
      isInstructor,
      isMasterAdmin,
      hasActiveAccess,
      needsSubscription
    });
    
    // Caso speciale per istruttore1@io.it
    if (userEmail === 'istruttore1@io.it' && isInstructor) {
      console.log('Garantiamo accesso per istruttore1@io.it');
      localStorage.setItem('hasInstructorAccess', 'true');
      localStorage.setItem('masterCode', '392673');
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
  }, [userEmail, isInstructor, isMasterAdmin, hasActiveAccess, needsSubscription]);

  return (
    <ProfileLayout
      userEmail={userEmail}
      isInstructor={isInstructor}
      isMasterAdmin={isMasterAdmin}
      needsSubscription={needsSubscription}
    />
  );
}
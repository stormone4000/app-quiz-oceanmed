import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = (userData: any, mode: 'student' | 'instructor') => {
    console.log('Login success:', userData, mode);
    
    // Salva i dati dell'utente nel localStorage
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('firstName', userData.first_name || '');
    localStorage.setItem('lastName', userData.last_name || '');
    localStorage.setItem('email', userData.email || '');
    
    // Imposta i flag in base al ruolo
    if (mode === 'instructor') {
      localStorage.setItem('isProfessor', 'true');
      localStorage.setItem('isStudent', 'false');
      
      // Caso speciale per istruttore1@io.it
      if (userData.email === 'istruttore1@io.it') {
        console.log('Garantiamo accesso per istruttore1@io.it');
        localStorage.setItem('hasInstructorAccess', 'true');
        localStorage.setItem('masterCode', '392673');
        localStorage.setItem('hasActiveAccess', 'true');
        localStorage.setItem('isCodeDeactivated', 'false');
        localStorage.setItem('needsSubscription', 'false');
        localStorage.setItem('isMasterAdmin', 'true');
      }
    } else {
      localStorage.setItem('isProfessor', 'false');
      localStorage.setItem('isStudent', 'true');
    }
    
    // Trigger eventi per aggiornare lo stato in tutti i componenti
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('localStorageUpdated'));
    
    // Reindirizza in base al ruolo
    if (mode === 'instructor') {
      if (userData.email === 'istruttore1@io.it' || userData.hasActiveAccess) {
        navigate('/dashboard');
      } else {
        navigate('/pricing');
      }
    } else {
      navigate('/student-dashboard');
    }
  };

  return (
    <div>
      {/* Renderizza il componente AuthScreen */}
    </div>
  );
};

export default AuthScreen; 
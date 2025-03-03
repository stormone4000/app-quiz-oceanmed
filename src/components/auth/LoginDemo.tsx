import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { LoginOptions } from './LoginOptions';
import { BackgroundGradientAnimation } from '../BackgroundGradientAnimation';
import { ThemeToggle } from '../ThemeToggle';
import type { UserRole } from '../../types';

export function LoginDemo() {
  const navigate = useNavigate();
  
  const handleRoleSelect = (role: UserRole) => {
    console.log('Ruolo selezionato:', role);
    // Qui gestiamo la logica di redirect in base al ruolo selezionato
    if (role.isProfessor && role.isMasterAdmin) {
      navigate('/dashboard/master');
    } else if (role.isProfessor) {
      navigate('/dashboard/instructor');
    } else if (role.isStudent) {
      navigate('/dashboard/student');
    }
  };
  
  const handleBack = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen relative">
      {/* Sfondo dinamico */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <BackgroundGradientAnimation
          gradientBackgroundStart="rgb(0, 26, 51)"
          gradientBackgroundEnd="rgb(0, 68, 102)"
          firstColor="0, 70, 140"
          secondColor="0, 120, 180"
          thirdColor="0, 150, 136"
          fourthColor="255, 255, 255"
          fifthColor="220, 20, 60"
        />
      </div>
      
      {/* Contenuto */}
      <div className="relative z-10 flex flex-col min-h-screen bg-transparent">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <header className="container mx-auto px-4 py-6 flex justify-between">
          <div className="flex items-center">
            <img
              src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img//logo-white.svg"
              alt="OceanMed Logo"
              className="h-12 w-auto mr-4"
            />
            <h1 className="text-2xl font-light text-white">Demo Login</h1>
          </div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Torna alla Home
          </button>
        </header>
        
        <main className="flex-grow container mx-auto px-4 py-8">
          <LoginOptions onRoleSelect={handleRoleSelect} />
        </main>
        
        <footer className="container mx-auto px-4 py-6 text-center text-white/60 text-sm">
          &copy; {new Date().getFullYear()} OceanMed Sailing. Tutti i diritti riservati.
        </footer>
      </div>
    </div>
  );
} 
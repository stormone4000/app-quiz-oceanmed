import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap, LockKeyhole, ChevronRight, Sailboat } from 'lucide-react';
import { motion } from 'framer-motion';
import { BackgroundGradientAnimation } from './BackgroundGradientAnimation';
import { ThemeToggle } from './ThemeToggle';
import { FlickeringGrid } from './ui/FlickeringGrid';
import { AnimatedTooltipShadcn } from './ui/AnimatedTooltipShadcn';
import { useAppDispatch } from '../redux/hooks';
import { logout } from '../redux/slices/authSlice';

export function LandingPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const handleModeSelect = (mode: 'student' | 'instructor') => {
    // Utilizzo di Redux per il logout
    dispatch(logout());
    
    if (mode === 'student') {
      navigate('/login');
    } else {
      navigate('/login-instructor');
    }
  };

  // Imposta il tema dark come default se non specificato
  useEffect(() => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient animation */}
      <div className="absolute inset-0 z-0">
        <BackgroundGradientAnimation
          gradientBackgroundStart="rgb(18, 24, 38)"
          gradientBackgroundEnd="rgb(18, 24, 38)"
          firstColor="18, 113, 255"
          secondColor="162, 18, 255"
          thirdColor="13, 182, 245"
          fourthColor="31, 53, 138"
          fifthColor="99, 10, 148"
          pointerColor="140, 100, 255"
          size="80%"
          blendingValue="hard-light"
          className="absolute inset-0 z-0"
        />
      </div>

      {/* Wrapper per il contenuto, con stacking context più alto */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <main className="flex-grow flex flex-col items-center justify-center px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <img
              src="https://uqutbomzymeklyowfewp.supabase.co/storage/v1/object/public/img//logo-white.svg"
              alt="OceanMed Logo"
              className="h-24 w-auto mx-auto mb-6"
            />
            <h1 className="text-5xl font-light text-white mb-4 drop-shadow-lg">
              Global Quiz
            </h1>
            <p className="text-lg text-white/80 mb-8">
              Scegli come vuoi iniziare il tuo percorso verso la patente
            </p>
            
            <div className="flex justify-center mb-8 dark:bg-slate-800/0 bg-white/0 py-3 px-6 rounded-full backdrop-blur-sm">
              <AnimatedTooltipShadcn 
                items={[
                  {
                    id: 1,
                    name: "Antonio Marsano",
                    designation: "CEO",
                    image: "https://uqutbomzymeklyowfewp.supabase.co/storage/v1/object/public/img//pic_antonio.jpg"
                  },
                  {
                    id: 2,
                    name: "Nicola Berardi",
                    designation: "Istruttore Senior",
                    image: "https://uqutbomzymeklyowfewp.supabase.co/storage/v1/object/public/img//pic_berardi.jpg"
                  },
                  {
                    id: 3,
                    name: "Renato",
                    designation: "Studente",
                    image: "https://uqutbomzymeklyowfewp.supabase.co/storage/v1/object/public/img//pic_renato.jpeg"
                  },
                  {
                    id: 4,
                    name: "Scotty",
                    designation: "Mascotte",
                    image: "https://uqutbomzymeklyowfewp.supabase.co/storage/v1/object/public/img//pic_scotti_.jpg"
                  },
                  {
                    id: 5,
                    name: "Tommaso",
                    designation: "Istruttore Senior",
                    image: "https://uqutbomzymeklyowfewp.supabase.co/storage/v1/object/public/img//pic_tommaso.jpg"
                  }
                ]}
                className="justify-center"
              />
            </div>
          </div>
          
          {/* Sezione Accedi */}
          <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-6 mb-8 w-full max-w-3xl relative overflow-hidden">
            <FlickeringGrid 
              squareSize={2}
              gridGap={8}
              color="rgb(59, 130, 246)" 
              flickerChance={0.02}
              maxOpacity={0.15}
              className="dark:opacity-30 opacity-20"
            />
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Accedi</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Scegli come vuoi accedere alla piattaforma</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-slate-800/50 border border-blue-100 dark:border-white/5 rounded-lg p-4 flex flex-col items-center group hover:bg-blue-100 dark:hover:bg-slate-800/80 transition-colors duration-300 hover:shadow-md dark:hover:shadow-blue-500/10 hover:shadow-blue-500/20">
                  <div className="rounded-lg p-2 mb-3 group-hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-center mb-4">
                    <h3 className="text-gray-800 dark:text-white font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">Studente</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Accedi come studente per i tuoi corsi</p>
                  </div>
                  <button
                    onClick={() => handleModeSelect('student')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center group-hover:shadow-lg transform group-hover:translate-x-1 duration-300"
                  >
                    Accedi <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </button>
                </div>
                
                <div className="bg-emerald-50 dark:bg-slate-800/50 border border-emerald-100 dark:border-white/5 rounded-lg p-4 flex flex-col items-center group hover:bg-emerald-100 dark:hover:bg-slate-800/80 transition-colors duration-300 hover:shadow-md dark:hover:shadow-emerald-500/10 hover:shadow-emerald-500/20">
                  <div className="rounded-lg p-2 mb-3 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="text-center mb-4">
                    <h3 className="text-gray-800 dark:text-white font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors duration-300">Istruttore</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Accedi come istruttore o amministratore</p>
                  </div>
                  <button
                    onClick={() => handleModeSelect('instructor')}
                    className="w-full bg-emerald-600 dark:bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center group-hover:shadow-lg transform group-hover:translate-x-1 duration-300"
                  >
                    Accedi <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Sezione Patenti */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group hover:scale-105 transition-transform duration-300 hover:shadow-xl dark:hover:shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer">
              <FlickeringGrid 
                squareSize={2}
                gridGap={6}
                color="rgb(37, 99, 235)"
                flickerChance={0.015}
                maxOpacity={0.2}
                className="dark:opacity-25 opacity-15 group-hover:opacity-40 dark:group-hover:opacity-50 transition-opacity duration-300"
              />
              <div className="relative z-10">
                <div className="text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M3 11c0-3.771 0-5.657 1.172-6.828C5.343 3 7.229 3 11 3h2c3.771 0 5.657 0 6.828 1.172C21 5.343 21 7.229 21 11v2c0 3.771 0 5.657-1.172 6.828C18.657 21 16.771 21 13 21h-2c-3.771 0-5.657 0-6.828-1.172C3 18.657 3 16.771 3 13v-2Z"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="m10 8.484.748-1.496a1 1 0 0 1 1.788 0L14 11.23m-6.958 2.27 2.21-4.211a1 1 0 0 1 1.786-.059L15 16m-3-3.5 2.5 3.5M7 8h1.5M7 12h1.5M7 16h1.5"
                    />
                  </svg>
                </div>
                <h3 className="text-gray-800 dark:text-white font-medium mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">Patenti Nautiche</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Corsi completi per patenti entro e oltre le 12 miglia, vela e motore. Preparati con i nostri materiali esclusivi.
                </p>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group hover:scale-105 transition-transform duration-300 hover:shadow-xl dark:hover:shadow-violet-500/10 hover:shadow-violet-500/20 cursor-pointer">
              <FlickeringGrid 
                squareSize={2}
                gridGap={6}
                color="rgb(124, 58, 237)"
                flickerChance={0.018}
                maxOpacity={0.2} 
                className="dark:opacity-25 opacity-15 group-hover:opacity-40 dark:group-hover:opacity-50 transition-opacity duration-300"
              />
              <div className="relative z-10">
                <div className="text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M20 12v-2a2 2 0 0 0-2-2h-2c0-3.771 0-5.657-1.172-6.828C13.657 0 11.771 0 8 0H2v2l2 3.12m16.212 16.88c1.055 0 1.91-.854 1.91-1.91 0-1.055-.855-1.91-1.91-1.91-1.055 0-1.91.855-1.91 1.91 0 1.056.855 1.91 1.91 1.91ZM4 21c.932 0 1.687-.755 1.687-1.687 0-.932-.755-1.688-1.687-1.688-.932 0-1.688.756-1.688 1.688 0 .932.756 1.687 1.688 1.687Z"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M11.5 3h-5m5 3h-5m5 3H8M4 13.988V9.536c0-.83.33-1.626.916-2.213a3.12 3.12 0 0 1 2.214-.914h2.7c.93 0 1.821.37 2.48 1.027l5.55 5.549a3.5 3.5 0 0 1 1.027 2.479v.286c0 .305-.024.61-.073.91l-.34 2.043A2.302 2.302 0 0 1 16.2 20.6H7.8a2.301 2.301 0 0 1-2.29-2.1L4 13.989Z"
                    />
                  </svg>
                </div>
                <h3 className="text-gray-800 dark:text-white font-medium mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">Patenti Auto e Moto</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Preparati per la patente A, B e superiori con quiz aggiornati, simulazioni d'esame e contenuti multimediali.
                </p>
              </div>
            </div>
            
            <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-6 relative overflow-hidden group hover:scale-105 transition-transform duration-300 hover:shadow-xl dark:hover:shadow-pink-500/10 hover:shadow-pink-500/20 cursor-pointer">
              <FlickeringGrid 
                squareSize={2}
                gridGap={6}
                color="rgb(219, 39, 119)"
                flickerChance={0.02}
                maxOpacity={0.2}
                className="dark:opacity-25 opacity-15 group-hover:opacity-40 dark:group-hover:opacity-50 transition-opacity duration-300" 
              />
              <div className="relative z-10">
                <div className="text-pink-600 dark:text-pink-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M9 19.2c-1.12 0-2.16-.32-3.04-.88L3 20l1.2-3.04A5.97 5.97 0 0 1 3 13c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6Z"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M13 7c3.31 0 6 2.69 6 6 0 1.12-.32 2.16-.88 3.04L20 19l-2.96-1.68A5.97 5.97 0 0 1 13 18"
                    />
                  </svg>
                </div>
                <h3 className="text-gray-800 dark:text-white font-medium mb-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors duration-300">Patenti Professionali</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Corsi specializzati per patenti C, D, E, CQC e altri certificati professionali per trasporto merci e persone.
                </p>
              </div>
            </div>
          </div>
          
          <footer className="mt-12 text-center text-white/60 text-sm">
            © 2025 OceanMed Sailing. Tutti i diritti riservati.
          </footer>
        </main>
      </div>
    </div>
  );
}
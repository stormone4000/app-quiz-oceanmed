import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogIn, Key } from 'lucide-react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { BackgroundGradientAnimation } from './BackgroundGradientAnimation';
import { AnimatedTooltip } from './AnimatedTooltip';
import { ThemeToggle } from './ThemeToggle';

export function LandingPage() {
  const navigate = useNavigate();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const handleNavigation = (path: string) => {
    // Clear all auth-related storage
    localStorage.clear();
    sessionStorage.clear();
    navigate(path, { replace: true });
  };

  return (
    <div className="min-h-screen relative">
      {/* Wrapper per lo sfondo dinamico */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <BackgroundGradientAnimation
          gradientBackgroundStart="rgb(0, 26, 51)"    // Blu profondo, come le acque in profondità
          gradientBackgroundEnd="rgb(0, 68, 102)"     // Blu un po' più chiaro, che richiama le acque in superficie
          firstColor="0, 70, 140"                       // Blu navy per un accento deciso
          secondColor="0, 120, 180"                     // Blu medio, fresco e pulito
          thirdColor="0, 150, 136"                      // Teal, che ricorda il colore dell’acqua trasparente
          fourthColor="255, 255, 255"                   // Bianco, per evocare la schiuma delle onde
          fifthColor="220, 20, 60"                      // Rosso nautico, classico richiamo al mondo marino
        />
      </div>

      {/* Wrapper per il contenuto, con stacking context più alto */}
      <div className="relative z-10 flex flex-col min-h-screen bg-transparent">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <main className="flex-grow container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <img
              src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img//logo-white.svg"
              alt="OceanMed Logo"
              className="h-24 w-auto mx-auto mb-8"
            />
            <h1 className="text-5xl font-light text-white dark:text-slate-50 mb-4 drop-shadow-lg">
              Scuola Nautica
            </h1>
            <p className="text-1xl text-blue-100 dark:text-slate-200 mb-8 drop-shadow">
              Scegli come vuoi iniziare il tuo percorso verso la patente
            </p>
            <AnimatedTooltip />
          </div>

          {/* Bento Grid */}
          <div className="bento-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card: Nuovo Utente */}
            <motion.div
              onMouseMove={onMouseMove}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="group relative rounded-xl border bg-slate-800/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 flex flex-col items-center transition-all"
            >
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                  background: useMotionTemplate`
                    radial-gradient(
                      650px circle at ${mouseX}px ${mouseY}px,
                      rgba(34, 197, 94, 0.15),
                      transparent 80%
                    )
                  `,
                }}
              />
              <div className="relative w-full text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center p-1 rounded-full">
                    <UserPlus className="w-6 h-6 text-emerald-300" />
                  </div>
                </div>
                <h2 className="text-base font-light text-white dark:text-white mb-2">Nuovo Utente</h2>
                <p className="text-sm text-white dark:text-slate-300 mb-6">
                  Crea un nuovo account
                </p>
                <button
                  onClick={() => handleNavigation('/register')}
                  className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Registrati
                </button>
              </div>
            </motion.div>

            {/* Card: Account Esistente */}
            <motion.div
              onMouseMove={onMouseMove}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="group relative rounded-xl border bg-slate-800/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 flex flex-col items-center transition-all"
            >
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                  background: useMotionTemplate`
                    radial-gradient(
                      650px circle at ${mouseX}px ${mouseY}px,
                      rgba(59, 130, 246, 0.15),
                      transparent 80%
                    )
                  `,
                }}
              />
              <div className="relative w-full text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center p-1 rounded-full">
                    <LogIn className="w-6 h-6 text-blue-300" />
                  </div>
                </div>
                <h2 className="text-base font-light text-white mb-2">Account Esistente</h2>
                <p className="text-sm text-gray-200 mb-6">
                  Accedi al tuo account
                </p>
                <button
                  onClick={() => handleNavigation('/login')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  Accedi
                </button>
              </div>
            </motion.div>

            {/* Card: Istruttori */}
            <motion.div
              onMouseMove={onMouseMove}
              className="group relative rounded-xl border bg-slate-800/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 flex flex-col items-center transition-all"
            >
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                  background: useMotionTemplate`
                    radial-gradient(
                      650px circle at ${mouseX}px ${mouseY}px,
                      rgba(99, 102, 241, 0.15),
                      transparent 80%
                    )
                  `,
                }}
              />
              <div className="relative w-full text-center">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center p-1 rounded-full">
                    <Key className="w-6 h-6 text-indigo-300" />
                  </div>
                </div>
                <h2 className="text-base font-light text-white mb-2">Istruttori</h2>
                <p className="text-sm text-gray-200 mb-6">
                  Accedi con il codice istruttore
                </p>
                <button
                  onClick={() => handleNavigation('/instructor')}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  <Key className="w-5 h-5" />
                  Area Istruttori
                </button>
              </div>
            </motion.div>
          </div>

          {/* Contatti */}
          <div className="mt-12 text-center">
            <p className="text-blue-100">
              Hai bisogno di aiuto?{' '}
              <a
                href="mailto:support@oceanmedsailing.com"
                className="text-white hover:text-blue-200 transition-colors underline"
              >
                Contattaci
              </a>
            </p>
          </div>
        </main>

        {/* Footer con effetto glassmorphism */}
        <footer className="w-full py-4 bg-white/20 dark:bg-slate-800/20 backdrop-blur-md border-t border-white/30 dark:border-slate-700/30 text-center text-white dark:text-slate-50">
          <p className="text-sm">
            © {new Date().getFullYear()} OceanMed Sailing. Tutti i diritti riservati.
          </p>
        </footer>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogIn, Key, Mail, Lock, AlertCircle, Loader2, ArrowLeft, BookOpen, GraduationCap, ArrowRight } from 'lucide-react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { BackgroundGradientAnimation } from './BackgroundGradientAnimation';
import { AnimatedTooltip } from './AnimatedTooltip';
import { ThemeToggle } from './ThemeToggle';
import { supabase } from '../services/supabase';
import type { UserRole } from '../types';
import { DotPattern } from './ui/DotPattern';

export function LandingPage() {
  const navigate = useNavigate();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Stati per il login unificato
  const [showLogin, setShowLogin] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'student' | 'instructor' | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const handleNavigation = (path: string) => {
    // Rimuovo tutti i dati di autenticazione prima di navigare
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isProfessor');
    localStorage.removeItem('isMaster');
    localStorage.removeItem('activeCode');
    
    // Uso navigate imperativo invece di un componente Navigate
    navigate(path, { replace: true });
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };
  
  const handleModeSelect = (mode: 'student' | 'instructor') => {
    setSelectedMode(mode);
    setShowLogin(true);
  };
  
  const handleBack = () => {
    setShowLogin(false);
    setSelectedMode(null);
    setError(null);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.email || !formData.password) {
        throw new Error('Inserisci email e password');
      }

      // Hash password
      const passwordHash = await hashPassword(formData.password);
      
      // Get user details
      const { data: users, error: userError } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', formData.email.toLowerCase())
        .eq('password_hash', passwordHash)
        .single();
      
      if (userError || !users) {
        throw new Error('Email o password non validi');
      }

      if (users.account_status === 'suspended') {
        throw new Error('Account sospeso. Contatta il supporto.');
      }

      // Imposta flag autenticazione
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', users.email);
      localStorage.setItem('firstName', users.first_name || '');
      localStorage.setItem('lastName', users.last_name || '');

      // Se è un utente admin/master, reindirizza alla dashboard indipendentemente dalla selezione
      if (users.is_master) {
        localStorage.setItem('isProfessor', 'true');
        localStorage.setItem('hasActiveAccess', 'true');
        localStorage.setItem('isMasterAdmin', 'true');

        // Trigger dell'evento storage per aggiornare lo stato nell'app principale
        window.dispatchEvent(new Event('storage'));
        
        console.log('Account admin riconosciuto, reindirizzamento alla dashboard...');
        navigate('/dashboard', { replace: true });
        return; // Return esplicito per fermare l'esecuzione
      }

      // Verifica se la modalità selezionata è coerente con i permessi utente
      if (selectedMode === 'instructor' && !users.is_instructor) {
        throw new Error('Account non autorizzato come istruttore');
      }

      // Se l'utente è un istruttore
      if (selectedMode === 'instructor') {
        // Check subscription status for instructors
        let hasAccess = false;

        // Check instructor profile
        const { data: profile, error: profileError } = await supabase
          .from('instructor_profiles')
          .select('subscription_status')
          .eq('email', users.email)
          .single();
          
        if (profileError) {
          console.warn('Profilo istruttore non trovato, creazione nuovo profilo:', profileError);
          // Se non esiste un profilo, lo creiamo con stato inactive
          const { error: insertError } = await supabase
            .from('instructor_profiles')
            .insert([
              { 
                email: users.email,
                first_name: users.first_name,
                last_name: users.last_name,
                subscription_status: 'inactive',
                created_at: new Date().toISOString()
              }
            ]);
            
          if (insertError) {
            console.error('Errore nella creazione del profilo istruttore:', insertError);
          }
        } else {
          hasAccess = profile?.subscription_status === 'active';
        }
        
        // Store instructor data
        localStorage.setItem('isProfessor', 'true');
        localStorage.setItem('hasActiveAccess', hasAccess ? 'true' : 'false');
        localStorage.removeItem('isMasterAdmin');

        // Trigger dell'evento storage per aggiornare lo stato nell'app principale
        window.dispatchEvent(new Event('storage'));
        
        // Redirect based on access status
        if (hasAccess) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/pricing', { replace: true });
        }
      } else {
        // Se l'utente è uno studente
        localStorage.removeItem('isProfessor');
        localStorage.removeItem('hasActiveAccess');
        localStorage.removeItem('isMasterAdmin');

        // Trigger dell'evento storage per aggiornare lo stato nell'app principale
        window.dispatchEvent(new Event('storage'));
        
        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  // Aggiungo una funzione didecta per il ThemeToggle per impostare il tema
  useEffect(() => {
    // Imposta il tema light come default se non specificato
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    if (!localStorage.getItem('theme')) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-900 to-slate-900 dark:from-slate-900 dark:to-slate-900">
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
              className="h-24 w-auto mx-auto mb-8 dark:opacity-100 opacity-85"
            />
            <h1 className="text-5xl font-light text-white dark:text-slate-50 mb-4 drop-shadow-lg">
              Global Quiz
            </h1>
            <p className="text-1xl text-blue-100 dark:text-slate-200 mb-8 drop-shadow">
              Scegli come vuoi iniziare il tuo percorso verso la patente
            </p>
            <AnimatedTooltip />
          </div>

          {/* Bento Grid */}
          <div className="bento-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card: Login Unificato */}
            <motion.div
              onMouseMove={onMouseMove}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="group relative rounded-xl border bg-white/90 dark:bg-slate-900/80 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 flex flex-col transition-all lg:col-span-3 overflow-hidden"
            >
              <DotPattern 
                spacing={20} 
                size={1.2} 
                dotColor="rgba(255, 255, 255, 0.15)" 
                className="absolute inset-0 z-0"
              />
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                  background: useMotionTemplate`
                    radial-gradient(
                      650px circle at ${mouseX}px ${mouseY}px,
                      rgba(56, 189, 248, 0.15),
                      transparent 80%
                    )
                  `,
                }}
              />
              <div className="relative z-10 w-full">
                {!showLogin ? (
                  <>
                    <h2 className="text-xl font-medium text-black dark:text-white mb-2">Accedi</h2>
                    <p className="text-sm text-black dark:text-slate-300 mb-6">
                      Scegli come vuoi accedere alla piattaforma
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleModeSelect('student')}
                        className="relative overflow-hidden rounded-lg border border-blue-500/30 bg-blue-500/20 hover:bg-blue-500/30 text-white transition-all h-20"
                      >
                        <DotPattern 
                          spacing={12} 
                          size={0.8} 
                          dotColor="rgba(79, 78, 78, 0.3)" 
                          className="absolute inset-0"
                          patternClassName="opacity-60"
                        />
                        <div className="relative z-10 flex h-full w-full p-4">
                          <div className="flex items-center">
                            <div className="mr-4">
                              <GraduationCap className="w-8 h-8 text-blue-700 dark:text-blue-500" />
                            </div>
                            <div className="flex flex-col items-start justify-center">
                              <h3 className="text-xl text-black dark:text-white">Studente</h3>
                              <p className="text-sm text-black dark:text-white">Accedi come studente per i tuoi corsi</p>
                            </div>
                          </div>
                          <div className="ml-auto flex items-center">
                            <div className="text-base text-blue-700 dark:text-blue-200">Accedi</div>
                            <ArrowRight className="w-5 h-5 ml-1 text-blue-700 dark:text-blue-300" />
                          </div>
                        </div>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleModeSelect('instructor')}
                        className="relative overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 text-white transition-all h-20"
                      >
                        <DotPattern 
                          spacing={12} 
                          size={0.8} 
                          dotColor="rgba(16, 185, 129, 0.3)" 
                          className="absolute inset-0"
                          patternClassName="opacity-60"
                        />
                        <div className="relative z-10 flex h-full w-full p-4">
                          <div className="flex items-center">
                            <div className="mr-4">
                              <BookOpen className="w-8 h-8 text-emerald-700 dark:text-emerald-300" />
                            </div>
                            <div className="flex flex-col items-start justify-center">
                              <h3 className="text-xl text-black dark:text-white">Istruttore</h3>
                              <p className="text-sm text-black dark:text-white">Accedi come istruttore o amministratore</p>
                            </div>
                          </div>
                          <div className="ml-auto flex items-center">
                            <div className="text-base text-emerald-700 dark:text-emerald-300">Accedi</div>
                            <ArrowRight className="w-5 h-5 ml-1 text-emerald-700 dark:text-emerald-300" />
                          </div>
                        </div>
                      </motion.button>
                    </div>
                  </>
                ) : (
                  <div className="w-full max-w-md mx-auto">
                    <div className="mb-6 flex items-center">
                      <button 
                        onClick={handleBack}
                        className="p-2 hover:bg-white/10 rounded-full mr-2"
                      >
                        <ArrowLeft className="w-5 h-5 text-black dark:text-white" />
                      </button>
                      <h2 className="text-2xl font-light text-black dark:text-white">
                        {selectedMode === 'student' ? 'Accesso Studente' : 'Accesso Istruttore'}
                      </h2>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm text-black dark:text-white block">Email</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-600 text-gray-400" />
                          </div>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="nome@esempio.com"
                            required
                            className="bg-black/2 dark:bg-slate-900/55 border border-black/20 dark:border-white/20 text-emerald-700 dark:text-emerald-300 placeholder-gray-400 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm text-black dark:text-white block">Password</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-gray-600 text-gray-400" />
                          </div>
                          <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            required
                            className="bg-black/2 dark:bg-slate-900/55 border border-black/20 dark:border-white/20 text-emerald-700 dark:text-emerald-300 placeholder-gray-400 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                          />
                        </div>
                      </div>
                      
                      {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center text-sm text-white">
                          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                          {error}
                        </div>
                      )}
                      
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5 transition-all disabled:opacity-70 disabled:hover:bg-blue-600"
                      >
                        {loading ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <LogIn className="h-5 w-5 mr-2" />
                        )}
                        Accedi
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Card: Patenti Nautiche */}
            <motion.div
              onMouseMove={onMouseMove}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
              whileHover={{ scale: 1.02 }}
              className="group relative rounded-xl border bg-slate-100/90 dark:bg-slate-900/80 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 overflow-hidden"
            >
              <DotPattern 
                spacing={16} 
                dotColor="rgba(14, 165, 233, 0.15)" 
                className="absolute inset-0"
              />
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                  background: useMotionTemplate`
                    radial-gradient(
                      650px circle at ${mouseX}px ${mouseY}px,
                      rgba(14, 165, 233, 0.15),
                      transparent 80%
                    )
                  `,
                }}
              />
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="mb-3">
                      <div className="inline-flex items-center justify-center p-1 rounded-full">
                        <svg
                          className="w-6 h-6 text-sky-700 dark:text-sky-300"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                    </div>
                    <h2 className="text-base font-medium text-black dark:text-white mb-2">
                      Patenti Nautiche
                    </h2>
                    <p className="text-sm text-gray-900 dark:text-slate-400">
                      Corsi completi per patenti entro e oltre le 12 miglia, vela e motore. Preparati con i nostri materiali esclusivi.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card: Patenti Auto e Moto */}
            <motion.div
              onMouseMove={onMouseMove}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
              whileHover={{ scale: 1.02 }}
              className="group relative rounded-xl border bg-slate-100/90 dark:bg-slate-900/80 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 overflow-hidden"
            >
              <DotPattern 
                spacing={16} 
                dotColor="rgba(124, 58, 237, 0.15)" 
                className="absolute inset-0"
              />
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                  background: useMotionTemplate`
                    radial-gradient(
                      650px circle at ${mouseX}px ${mouseY}px,
                      rgba(124, 58, 237, 0.15),
                      transparent 80%
                    )
                  `,
                }}
              />
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="mb-3">
                      <div className="inline-flex items-center justify-center p-1 rounded-full">
                        <svg
                          className="w-6 h-6 text-violet-700 dark:text-violet-300"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                    </div>
                    <h2 className="text-base font-medium text-black dark:text-white mb-2">
                      Patenti Auto e Moto
                    </h2>
                    <p className="text-sm text-gray-900 dark:text-slate-400">
                      Preparati per la patente A, B e superiori con quiz aggiornati, simulazioni d'esame e contenuti multimediali.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card: Patenti Speciali */}
            <motion.div
              onMouseMove={onMouseMove}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
              whileHover={{ scale: 1.02 }}
              className="group relative rounded-xl border bg-slate-100/90 dark:bg-slate-900/80 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 overflow-hidden"
            >
              <DotPattern 
                spacing={16} 
                dotColor="rgba(236, 72, 153, 0.15)" 
                className="absolute inset-0"
              />
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
                style={{
                  background: useMotionTemplate`
                    radial-gradient(
                      650px circle at ${mouseX}px ${mouseY}px,
                      rgba(236, 72, 153, 0.15),
                      transparent 80%
                    )
                  `,
                }}
              />
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="mb-3">
                      <div className="inline-flex items-center justify-center p-1 rounded-full">
                        <svg
                          className="w-6 h-6 text-pink-700 dark:text-pink-300"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M7 16.874a6.51 6.51 0 0 1-2.5-5.148C4.5 6.75 8.75 2.5 14 2.5c5.25 0 9.5 4.25 9.5 9.226 0 2.943-1.36 5.56-3.5 7.254A.775.775 0 0 0 19.5 20a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4c0-.5.5-.5.5-.5h1.75a2.25 2.25 0 0 0 2.25-2.25V16.5"
                          />
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M14 15h-3a2 2 0 0 1-2-2c0-3.5 1.5-5 3-5"
                          />
                          <path fill="currentColor" d="M14.5 8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                        </svg>
                      </div>
                    </div>
                    <h2 className="text-base font-medium text-black dark:text-white mb-2">
                      Patenti Professionali
                    </h2>
                    <p className="text-sm text-gray-900 dark:text-slate-400">
                      Corsi specializzati per patenti C, D, E, CQC e altri certificati professionali per trasporto merci e persone.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer Section */}
          <footer className="mt-16 text-center text-white">
            <p className="text-sm opacity-70">
              &copy; {new Date().getFullYear()} OceanMed Sailing. Tutti i diritti riservati.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
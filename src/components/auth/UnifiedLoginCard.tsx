import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { UserRole } from '../../types';
import { useAppDispatch } from '../../redux/hooks';
import { login } from '../../redux/slices/authSlice';

interface UnifiedLoginCardProps {
  onRoleSelect: (role: UserRole) => void;
}

export function UnifiedLoginCard({ onRoleSelect }: UnifiedLoginCardProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'login'>('select');
  const [selectedMode, setSelectedMode] = useState<'student' | 'instructor' | null>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleModeSelect = (mode: 'student' | 'instructor') => {
    setSelectedMode(mode);
    setStep('login');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedMode(null);
    setError(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

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

      // Verifica se la modalità selezionata è coerente con i permessi utente
      if (selectedMode === 'instructor' && !users.is_instructor) {
        throw new Error('Account non autorizzato come istruttore');
      }

      // Se è un utente master, reindirizza alla dashboard master
      if (users.is_master) {
        const userRole: UserRole = {
          isStudent: false,
          isProfessor: true,
          firstName: users.first_name,
          lastName: users.last_name,
          email: users.email,
          hasActiveAccess: true,
          hasInstructorAccess: true,
          isMasterAdmin: true,
          needsSubscription: false
        };
        
        // Dispatch dell'azione login con Redux
        dispatch(login(userRole));
        
        // Chiamiamo ancora onRoleSelect per retrocompatibilità
        onRoleSelect(userRole);

        navigate('/dashboard', { replace: true });
        return;
      }

      if (selectedMode === 'instructor') {
        // Check subscription status for instructors
        let hasAccess = false;

        // Check instructor profile
        const { data: profile } = await supabase
          .from('instructor_profiles')
          .select('subscription_status, access_code')
          .eq('email', users.email)
          .single();

        hasAccess = profile?.subscription_status === 'active';
        const accessCode = profile?.access_code || '';

        // Verifichiamo anche se l'utente ha un codice di accesso attivo
        let hasActiveCode = false;
        if (accessCode) {
          const { data: codeData } = await supabase
            .from('access_codes')
            .select('*')
            .eq('code', accessCode)
            .eq('is_active', true)
            .single();
          
          hasActiveCode = !!codeData;
        }

        // Determiniamo se l'utente ha accesso come istruttore
        const hasInstructorAccess = hasAccess || hasActiveCode;
        
        const userRole: UserRole = {
          isStudent: false,
          isProfessor: true,
          firstName: users.first_name,
          lastName: users.last_name,
          email: users.email,
          hasActiveAccess: hasInstructorAccess,
          hasInstructorAccess: hasInstructorAccess,
          isMasterAdmin: false, // Esplicitamente false per gli istruttori
          needsSubscription: !hasInstructorAccess
        };
        
        // Salviamo il masterCode se presente
        if (accessCode) {
          localStorage.setItem('masterCode', accessCode);
        }
        
        // Dispatch dell'azione login con Redux
        dispatch(login(userRole));
        
        // Chiamiamo ancora onRoleSelect per retrocompatibilità
        onRoleSelect(userRole);

        // Redirect based on access status
        if (hasInstructorAccess) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/pricing', { replace: true });
        }
      } else {
        // Studente
        const userRole: UserRole = {
          isStudent: true,
          isProfessor: false,
          firstName: users.first_name || '',
          lastName: users.last_name || '',
          email: users.email,
          isMasterAdmin: false, // Esplicitamente false per gli studenti
          hasActiveAccess: false,
          hasInstructorAccess: false,
          needsSubscription: false
        };
        
        // Rimuoviamo i dati aggiuntivi che potrebbero essere rimasti
        localStorage.removeItem('masterCode');
        
        // Dispatch dell'azione login con Redux
        dispatch(login(userRole));
        
        // Chiamiamo ancora onRoleSelect per retrocompatibilità
        onRoleSelect(userRole);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl border bg-slate-800/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 flex flex-col items-center transition-all"
    >
      {step === 'select' ? (
        <div className="w-full text-center">
          <h2 className="text-2xl font-light text-white dark:text-white mb-6">Accedi</h2>
          <p className="text-sm text-white dark:text-slate-300 mb-8">
            Scegli come vuoi accedere alla piattaforma
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-slate-900/80 rounded-lg border border-slate-700/50 p-6 text-center">
              {/* Icona - Posizionata in alto e centrata */}
              <div className="block w-full text-center mb-4">
                <svg className="w-10 h-10 text-blue-400 inline-block" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 14v7M10 21h4M12 14a6 6 0 0 0 6-6V5a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v3a6 6 0 0 0 6 6Z"
                  />
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M4.5 8.6c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2M12 4V2"
                  />
                </svg>
              </div>
              
              {/* Titolo - Posizionato sotto l'icona e centrato */}
              <h3 className="text-xl font-medium text-white mb-2 block w-full text-center">Studente</h3>
              
              {/* Descrizione - Posizionata sotto il titolo e centrata */}
              <p className="text-gray-400 text-sm mb-6 block w-full text-center">
                Accedi come studente per i tuoi corsi
              </p>
              
              {/* Pulsante - Posizionato in basso e a larghezza piena */}
              <button
                onClick={() => handleModeSelect('student')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
              >
                Accedi
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M13 5l7 7-7 7M20 12H4"
                  />
                </svg>
              </button>
            </div>
            
            <div className="bg-slate-900/80 rounded-lg border border-slate-700/50 p-6 text-center">
              {/* Icona - Posizionata in alto e centrata */}
              <div className="block w-full text-center mb-4">
                <svg className="w-10 h-10 text-emerald-400 inline-block" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 9.5V21M5 21h14M6 16.5V8.3a.8.8 0 0 1 .8-.8h10.4a.8.8 0 0 1 .8.8v8.2"
                  />
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="m9 5.2 3-2.4 3 2.4M9 7.5l3 2.4 3-2.4"
                  />
                </svg>
              </div>
              
              {/* Titolo - Posizionato sotto l'icona e centrato */}
              <h3 className="text-xl font-medium text-white mb-2 block w-full text-center">Istruttore</h3>
              
              {/* Descrizione - Posizionata sotto il titolo e centrata */}
              <p className="text-gray-400 text-sm mb-6 block w-full text-center">
                Accedi come istruttore o amministratore
              </p>
              
              {/* Pulsante - Posizionato in basso e a larghezza piena */}
              <button
                onClick={() => handleModeSelect('instructor')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg flex items-center justify-center transition-colors"
              >
                Accedi
                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M13 5l7 7-7 7M20 12H4"
                  />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-sm text-white">
            Non hai un account?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-400 hover:underline"
            >
              Registrati
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <div className="mb-6 flex items-center">
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-white/10 rounded-full mr-2"
            >
              <div className="text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M19 12H5M12 19l-7-7 7-7"
                  />
                </svg>
              </div>
            </button>
            <h2 className="text-2xl font-light text-white">
              {selectedMode === 'student' ? 'Accesso Studente' : 'Accesso Istruttore'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white block">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M21 5.5v13c0 .83-.67 1.5-1.5 1.5h-15c-.83 0-1.5-.67-1.5-1.5v-13c0-.83.67-1.5 1.5-1.5h15c.83 0 1.5.67 1.5 1.5Z"
                      />
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="m3.5 6.5 8.5 7 8.5-7"
                      />
                    </svg>
                  </div>
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="nome@esempio.com"
                  required
                  className="bg-white/10 border border-white/20 text-white placeholder-gray-400 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-white block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M17 11V8c0-3.31-2.69-6-6-6S5 4.69 5 8v3"
                      />
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M17 11H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2Z"
                      />
                    </svg>
                  </div>
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="bg-white/10 border border-white/20 text-white placeholder-gray-400 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5"
                />
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center text-sm text-white">
                <div className="text-red-400 mr-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
                    />
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 8v4M12 16h.01"
                    />
                  </svg>
                </div>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5 transition-all disabled:opacity-70 disabled:hover:bg-blue-600"
            >
              {loading ? (
                <div className="text-white mr-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="text-white mr-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
                    />
                  </svg>
                </div>
              )}
              Accedi
            </button>
            
            <div className="text-sm text-center text-white mt-4">
              Non hai un account?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-blue-400 hover:underline"
              >
                Registrati
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
} 
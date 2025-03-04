import React, { useState, useEffect } from 'react';
import { LogIn, Mail, Lock, Key, AlertCircle, RefreshCw, Play, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import type { UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../redux/hooks';
import { login } from '../redux/slices/authSlice';

interface AuthScreenProps {
  mode: 'student' | 'instructor';
  onRoleSelect?: (role: UserRole) => void; // Reso opzionale per retrocompatibilità
}

export function AuthScreen({ onRoleSelect, mode }: AuthScreenProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    accessCode: '',
    gamePin: '',
    nickname: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'login' | 'pin' | 'nickname'>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [successMessage, setSuccessMessage] = useState<string | null>(
    location.state?.showMessage || null
  );

  useEffect(() => {
    // Pre-fill email if coming from registration
    if (location.state?.registrationEmail) {
      setFormData(prev => ({
        ...prev,
        email: location.state.registrationEmail
      }));
    }
    // Aggiungo questa riga per prevenire esecuzioni ripetute
    return () => {};
  }, [location.state]);

  const handleGamePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { data: session, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select('id, status')
        .eq('pin', formData.gamePin)
        .single();

      if (sessionError) throw new Error('PIN non valido');
      if (session.status !== 'waiting') throw new Error('Sessione non disponibile');

      setStep('nickname');
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la verifica del PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { data: session, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select('id')
        .eq('pin', formData.gamePin)
        .single();

      if (sessionError) throw sessionError;

      const { error: participantError } = await supabase
        .from('live_quiz_participants')
        .insert([{
          session_id: session.id,
          nickname: formData.nickname
        }]);

      if (participantError) throw participantError;

      navigate(`/quiz-live/waiting/${formData.gamePin}`);
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Errore durante l\'accesso alla sessione');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Prima di tentare di autenticare, assicuriamoci che tutti i dati di autenticazione siano rimossi
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isProfessor');
    localStorage.removeItem('isMasterAdmin');
    localStorage.removeItem('hasActiveAccess');
    localStorage.removeItem('hasInstructorAccess');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    
    try {
      if (mode === 'instructor') {
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
        
        // Caso speciale per marcosrenatobruno@gmail.com (ADMIN)
        if (users.email === 'marcosrenatobruno@gmail.com') {
          console.log('Garantiamo accesso admin per marcosrenatobruno@gmail.com');
          localStorage.setItem('userEmail', users.email);
          localStorage.setItem('isProfessor', 'true');
          localStorage.setItem('hasActiveAccess', 'true');
          localStorage.setItem('hasInstructorAccess', 'true');
          localStorage.setItem('isMasterAdmin', 'true');
          localStorage.setItem('firstName', users.first_name || '');
          localStorage.setItem('lastName', users.last_name || '');
          localStorage.setItem('needsSubscription', 'false');

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
          
          // Per retrocompatibilità
          if (onRoleSelect) {
            onRoleSelect(userRole);
          }

          navigate('/dashboard');
          
          // Triggera un evento storage per forzare la sincronizzazione dei dati
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('localStorageUpdated'));
          
          return;
        }
        
        // Caso speciale per istruttore1@io.it (istruttore autenticato)
        if (users.email === 'istruttore1@io.it') {
          console.log('Garantiamo accesso istruttore per istruttore1@io.it');
          localStorage.setItem('userEmail', users.email);
          localStorage.setItem('isProfessor', 'true');
          localStorage.setItem('hasActiveAccess', 'true');
          localStorage.setItem('hasInstructorAccess', 'true');
          localStorage.setItem('isMasterAdmin', 'false');
          localStorage.setItem('firstName', users.first_name || '');
          localStorage.setItem('lastName', users.last_name || '');
          localStorage.setItem('needsSubscription', 'false');
          localStorage.setItem('masterCode', '392673');

          const userRole: UserRole = {
            isStudent: false,
            isProfessor: true,
            firstName: users.first_name,
            lastName: users.last_name,
            email: users.email,
            hasActiveAccess: true,
            hasInstructorAccess: true,
            isMasterAdmin: false,
            needsSubscription: false
          };

          // Dispatch dell'azione login con Redux
          dispatch(login(userRole));
          
          // Per retrocompatibilità
          if (onRoleSelect) {
            onRoleSelect(userRole);
          }

          navigate('/dashboard');
          
          // Triggera un evento storage per forzare la sincronizzazione dei dati
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('localStorageUpdated'));
          
          return;
        }
        
        // Check if master admin
        if (users.is_master) {
          localStorage.setItem('userEmail', users.email);
          localStorage.setItem('isProfessor', 'true');
          localStorage.setItem('hasActiveAccess', 'true');
          localStorage.setItem('hasInstructorAccess', 'true');
          localStorage.setItem('isMasterAdmin', 'true');
          localStorage.setItem('firstName', users.first_name || '');
          localStorage.setItem('lastName', users.last_name || '');

          const userRole: UserRole = {
            isStudent: false,
            isProfessor: true,
            firstName: users.first_name,
            lastName: users.last_name,
            email: users.email,
            hasActiveAccess: true,
            hasInstructorAccess: true,
            isMasterAdmin: true
          };

          // Dispatch dell'azione login con Redux
          dispatch(login(userRole));
          
          // Per retrocompatibilità
          if (onRoleSelect) {
            onRoleSelect(userRole);
          }

          navigate('/dashboard');
          
          // Triggera un evento storage per forzare la sincronizzazione dei dati
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('localStorageUpdated'));
          
          return;
        }

        // Check instructor status
        if (!users.is_instructor) {
          throw new Error('Account non autorizzato come istruttore');
        }

        // Check subscription status
        let hasAccess = false;

        // Check master code override
        if (formData.accessCode === '55555') {
          hasAccess = true;
        } else {
          // Check instructor profile
          const { data: profile } = await supabase
            .from('instructor_profiles')
            .select('subscription_status')
            .eq('email', users.email)
            .single();

          hasAccess = profile?.subscription_status === 'active';
        }

        // Store instructor data
        localStorage.setItem('userEmail', users.email);
        localStorage.setItem('isProfessor', 'true');
        localStorage.setItem('hasActiveAccess', hasAccess ? 'true' : 'false');
        localStorage.setItem('hasInstructorAccess', hasAccess ? 'true' : 'false');
        localStorage.setItem('firstName', users.first_name || '');
        localStorage.setItem('lastName', users.last_name || '');

        const userRole: UserRole = {
          isStudent: false,
          isProfessor: true,
          firstName: users.first_name,
          lastName: users.last_name,
          email: users.email,
          hasActiveAccess: hasAccess,
          hasInstructorAccess: hasAccess,
          needsSubscription: !hasAccess
        };

        // Dispatch dell'azione login con Redux
        dispatch(login(userRole));
        
        // Per retrocompatibilità
        if (onRoleSelect) {
          onRoleSelect(userRole);
        }

        // Redirect based on access status
        if (hasAccess) {
          navigate('/dashboard');
          
          // Triggera un evento storage per forzare la sincronizzazione dei dati
          window.dispatchEvent(new Event('storage'));
        } else {
          navigate('/pricing');
        }
        
        return;
      }

      // For student login
      if (!formData.email || !formData.password) {
        throw new Error('Inserisci email e password');
      }
      
      const passwordHash = await hashPassword(formData.password);
      
      // Get user details and check credentials
      const { data: users, error: userError } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', formData.email.toLowerCase())
        .eq('password_hash', passwordHash);

      if (userError) throw userError;
      
      if (!users || users.length === 0) {
        throw new Error('Email o password non validi');
      }

      const user = users[0];

      // Store user email in localStorage
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', user.email.toLowerCase());
      localStorage.removeItem('isProfessor');
      localStorage.setItem('firstName', user.first_name || '');
      localStorage.setItem('lastName', user.last_name || '');
      localStorage.removeItem('accessCode');

      const userRole: UserRole = {
        isStudent: true,
        isProfessor: false,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email
      };

      // Dispatch dell'azione login con Redux
      dispatch(login(userRole));
      
      // Per retrocompatibilità
      if (onRoleSelect) {
        onRoleSelect(userRole);
      }

      // Triggera un evento storage per forzare la sincronizzazione dei dati
      window.dispatchEvent(new Event('storage'));

      // Navigate to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-8 text-white hover:text-blue-200 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna alla Home
        </button>

        <div className="text-center mb-8">
          <img 
            src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/sign/img/logo.svg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJpbWcvbG9nby5zdmciLCJpYXQiOjE3MzcwNTE0MTEsImV4cCI6MTc2ODU4NzQxMX0.UB0cavGc9Ha_FTkpHQZONaQ0MEGFglY96yl4GPCGZbM"
            alt="OceanMed Logo"
            className="h-20 w-auto mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-white dark:text-slate-50 mb-2">
            {mode === 'instructor' ? 'Area Istruttori' : 
             step === 'pin' ? 'Inserisci PIN di Gioco' :
             step === 'nickname' ? 'Scegli Nickname' :
             'Accedi al tuo account'}
          </h2>
          <p className="text-blue-100 dark:text-slate-200">
            {mode === 'instructor' ? 'Area riservata agli istruttori' : 
             step === 'pin' ? 'Inserisci il PIN fornito dal tuo istruttore' :
             step === 'nickname' ? 'Scegli un nickname per partecipare al quiz' :
             'Accedi al tuo account'}
          </p>
        </div>

        <div className="bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-slate-700/30 rounded-xl shadow-2xl p-8">
          {successMessage && (
            <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {mode === 'student' && step === 'pin' ? (
            <form onSubmit={handleGamePinSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  PIN di Gioco
                </label>
                <input
                  type="text"
                  value={formData.gamePin}
                  onChange={(e) => setFormData({ ...formData, gamePin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="w-full px-4 py-3 text-2xl tracking-widest font-mono rounded-lg border border-white/30 dark:border-slate-700/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center bg-white/10 dark:bg-slate-800/10 text-white dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="000000"
                  required
                  pattern="\d{6}"
                  autoFocus
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400 text-center">
                  Inserisci il codice a 6 cifre
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || formData.gamePin.length !== 6}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifica in corso...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Avvia Quiz
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('login')}
                className="w-full text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-300"
              >
                Torna al login
              </button>
            </form>
          ) : mode === 'student' && step === 'nickname' ? (
            <form onSubmit={handleNicknameSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full px-4 py-3 text-lg rounded-lg border border-white/30 dark:border-slate-700/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 dark:bg-slate-800/10 text-white dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="Il tuo nickname"
                  required
                  maxLength={20}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || !formData.nickname.trim()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Accesso in corso...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Inizia Subito
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'instructor' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 mb-1">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-white/30 dark:border-slate-700/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 dark:bg-slate-800/10 text-white dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                        placeholder="Email istruttore"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-white/30 dark:border-slate-700/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 dark:bg-slate-800/10 text-white dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                        placeholder="Password"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 mb-1">
                      Codice Master (opzionale)
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.accessCode}
                        onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-white/30 dark:border-slate-700/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 dark:bg-slate-800/10 text-white dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                        placeholder="Codice master (se disponibile)"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 mb-1">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-white/30 dark:border-slate-700/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 dark:bg-slate-800/10 text-white dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                        placeholder="Inserisci la tua email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-white/30 dark:border-slate-700/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 dark:bg-slate-800/10 text-white dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                        placeholder="Inserisci la password"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifica in corso...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Accedi
                  </>
                )}
              </button>

              {mode === 'student' && (
                <button
                  type="button"
                  onClick={() => setStep('pin')}
                  className="w-full text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  Accedi con PIN di Gioco
                </button>
              )}
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-300 dark:text-slate-400">
              {mode === 'instructor' ? 'Non hai ancora un account da istruttore?' : 'Non hai ancora un account?'}{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/register', { state: { userType: mode === 'instructor' ? 'professor' : 'student' } });
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Registrati qui
              </a>
            </p>
            
            {mode === 'instructor' ? (
              <p className="text-sm text-gray-300 dark:text-slate-400 mt-2">
                Sei uno studente?{' '}
                <button
                  onClick={() => navigate('/login', { state: { userType: 'student' } })}
                  className="text-blue-400 dark:text-blue-300 hover:text-blue-300 dark:hover:text-blue-200 font-medium"
                >
                  Accedi come studente
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-300 dark:text-slate-400">
                Sei un istruttore?{' '}
                <button
                  onClick={() => navigate('/login', { state: { userType: 'professor' } })}
                  className="text-blue-400 dark:text-blue-300 hover:text-blue-300 dark:hover:text-blue-200 font-medium"
                >
                  Accedi come istruttore
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
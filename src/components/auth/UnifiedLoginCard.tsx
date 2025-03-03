import React, { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, Loader2, ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import type { UserRole } from '../../types';

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

    // Prima di tentare di autenticare, assicuriamoci che tutti i dati di autenticazione siano rimossi
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isProfessor');
    localStorage.removeItem('isMasterAdmin');
    localStorage.removeItem('hasActiveAccess');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');

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

      // Se è un utente master, reindirizza alla dashboard master indipendentemente dalla selezione
      if (users.is_master) {
        localStorage.setItem('isProfessor', 'true');
        localStorage.setItem('hasActiveAccess', 'true');
        localStorage.setItem('isMasterAdmin', 'true');

        onRoleSelect({
          isStudent: false,
          isProfessor: true,
          firstName: users.first_name,
          lastName: users.last_name,
          email: users.email,
          hasActiveAccess: true,
          isMasterAdmin: true
        });
        
        // Triggera un evento storage per forzare la sincronizzazione
        window.dispatchEvent(new Event('storage'));

        navigate('/dashboard', { replace: true });
        return;
      }

      // Verifica se la modalità selezionata è coerente con i permessi utente
      if (selectedMode === 'instructor' && !users.is_instructor) {
        throw new Error('Account non autorizzato come istruttore');
      }

      if (selectedMode === 'instructor') {
        // Check subscription status for instructors
        let hasAccess = false;

        // Check instructor profile
        const { data: profile } = await supabase
          .from('instructor_profiles')
          .select('subscription_status')
          .eq('email', users.email)
          .single();

        hasAccess = profile?.subscription_status === 'active';

        // Store instructor data
        localStorage.setItem('isProfessor', 'true');
        localStorage.setItem('hasActiveAccess', hasAccess ? 'true' : 'false');

        onRoleSelect({
          isStudent: false,
          isProfessor: true,
          firstName: users.first_name,
          lastName: users.last_name,
          email: users.email,
          hasActiveAccess: hasAccess,
          needsSubscription: !hasAccess
        });
        
        // Triggera un evento storage per forzare la sincronizzazione
        window.dispatchEvent(new Event('storage'));

        // Redirect based on access status
        if (hasAccess) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/pricing', { replace: true });
        }
      } else {
        // Studente
        localStorage.removeItem('isProfessor');
        localStorage.removeItem('isMasterAdmin');
        localStorage.removeItem('hasActiveAccess');

        onRoleSelect({
          isStudent: true,
          isProfessor: false,
          firstName: users.first_name || '',
          lastName: users.last_name || '',
          email: users.email
        });
        
        // Triggera un evento storage per forzare la sincronizzazione
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
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleModeSelect('student')}
              className="flex flex-col items-center p-6 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg border border-blue-500/30 text-white transition-all"
            >
              <GraduationCap className="w-10 h-10 mb-3" />
              <span>Studente</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleModeSelect('instructor')}
              className="flex flex-col items-center p-6 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/30 text-white transition-all"
            >
              <BookOpen className="w-10 h-10 mb-3" />
              <span>Istruttore</span>
            </motion.button>
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
              <ArrowLeft className="w-5 h-5 text-white" />
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
                  <Mail className="h-5 w-5 text-gray-400" />
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
                  <Lock className="h-5 w-5 text-gray-400" />
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
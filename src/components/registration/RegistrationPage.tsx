import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface RegistrationForm {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  isInstructor: boolean;
  privacyConsent: boolean;
}

export function RegistrationPage() {
  const [form, setForm] = useState<RegistrationForm>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    isInstructor: false,
    privacyConsent: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Clear any existing auth data
    localStorage.clear();
    sessionStorage.clear();
    setLoading(true);

    try {
      // Validation
      if (!form.email || !form.password || !form.confirmPassword || !form.firstName || !form.lastName) {
        throw new Error('Tutti i campi obbligatori devono essere compilati');
      }

      if (!form.privacyConsent) {
        throw new Error('Devi accettare la Privacy Policy per continuare');
      }

      if (form.password !== form.confirmPassword) {
        throw new Error('Le password non coincidono');
      }

      if (form.password.length < 8) {
        throw new Error('La password deve essere di almeno 8 caratteri');
      }

      // Hash password
      const encoder = new TextEncoder();
      const data = encoder.encode(form.password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const passwordHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Check if email already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', form.email.toLowerCase());

      if (checkError) throw checkError;
      
      if (existingUsers && existingUsers.length > 0) {
        throw new Error('Email già registrata');
      }

      // Assicurati che isInstructor sia un booleano
      const isInstructor = form.isInstructor === true;
      
      // Imposta il ruolo corretto in base a isInstructor
      const role = isInstructor ? 'instructor' : 'student';

      // Log per debug
      console.log('Dati registrazione:', {
        email: form.email,
        isInstructor,
        role
      });

      // Usa i valori corretti nell'inserimento
      const userData = {
        email: form.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: form.firstName,
        last_name: form.lastName,
        is_instructor: isInstructor,
        account_status: isInstructor ? 'pending' : 'active',
        is_master: false,
        role: role, // Usa la variabile role impostata correttamente
        is_master_admin: false,
        created_at: new Date().toISOString()
      };

      // Inserimento in auth_users
      const { data: newUser, error: insertError } = await supabase
        .from('auth_users')
        .insert([userData])
        .select('id, role')
        .single();

      if (insertError) throw insertError;

      // Verifica che il ruolo sia stato impostato correttamente
      if (isInstructor && newUser && newUser.role !== 'instructor') {
        console.warn('Ruolo non impostato correttamente, correzione manuale...');
        
        // Correggi il ruolo
        await supabase
          .from('auth_users')
          .update({ role: 'instructor' })
          .eq('id', newUser.id);
      }

      // Per istruttori, inserisci in instructor_profiles
      if (isInstructor && newUser) {
        // Inserisci in instructor_profiles
        await supabase
          .from('instructor_profiles')
          .insert([{
            user_id: newUser.id, // Importante: imposta il collegamento corretto
            email: form.email.toLowerCase(),
            first_name: form.firstName,
            last_name: form.lastName,
            created_at: new Date().toISOString()
          }]);
      }

      // Store user email and access status in localStorage
      const userEmail = form.email.toLowerCase();
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('isProfessor', isInstructor ? 'true' : 'false');
      localStorage.setItem('firstName', form.firstName);
      localStorage.setItem('lastName', form.lastName);

      // Navigate to login page after successful registration
      navigate('/login', { 
        replace: true,
        state: { 
          registrationEmail: userEmail,
          showMessage: 'Registrazione completata con successo! Accedi al tuo account.'
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la registrazione');
      setLoading(false);
    }
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
          <img           src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/sign/img/logo.svg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJpbWcvbG9nby5zdmciLCJpYXQiOjE3MzcwNTE0MTEsImV4cCI6MTc2ODU4NzQxMX0.UB0cavGc9Ha_FTkpHQZONaQ0MEGFglY96yl4GPCGZbM&t=2025-01-16T18%3A16%3A51.251Z"
            alt="OceanMed Logo"
            className="h-20 w-auto mx-auto mb-4"
          />
          <h2 className="text-2xl font-light text-white dark:text-slate-50 mb-2">Crea il tuo account</h2>
          <p className="text-blue-100 dark:text-slate-200">
            Inizia il tuo percorso verso la patente nautica
          </p>
        </div>

        <div className="bg-blue-600/30 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-8">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 dark:text-slate-300 mb-1">
                  Nome *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder="Il tuo nome"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 dark:text-slate-300 mb-1">
                  Cognome *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder="Il tuo cognome"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 dark:text-slate-300 mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="La tua email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 dark:text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Crea una password"
                  required
                  minLength={8}
                />
              </div>
              <p className="mt-1 text-sm text-gray-400 dark:text-slate-400">
                Minimo 8 caratteri
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 dark:text-slate-300 mb-1">
                Conferma Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Conferma la password"
                  required
                />
              </div>
            </div>

            {form.isInstructor && (
              <>
                <p className="text-sm text-gray-50 dark:text-slate-400 pl-6">
                  Verrai reindirizzato alla pagina di abbonamento per attivare il tuo account istruttore
                </p>
              </>
            )}

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex items-center h-5 mt-1">
                  <input
                    type="checkbox"
                    checked={form.isInstructor}
                    onChange={(e) => setForm({ ...form, isInstructor: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500"
                  />
                </div>
                <label className="text-sm text-gray-50 dark:text-slate-300">
                  Registrati come Istruttore
                </label>
              </div>

              <div className="flex items-start gap-2">
                <div className="flex items-center h-5 mt-1">
                  <input
                    type="checkbox"
                    checked={form.privacyConsent}
                    onChange={(e) => setForm({ ...form, privacyConsent: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500"
                    required
                  />
                </div>
                <label className="text-sm text-gray-50 dark:text-slate-300">
                  Acconsento al trattamento dei dati personali *
                </label>
              </div>
              <a
                href="https://www.oceanmedsailing.com/privacy-policy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-300 hover:text-blue-700 hover:underline"
              >
                Consulta la Privacy Policy
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Registrazione in corso...
                </>
              ) : (
                'Crea Account'
              )}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-gray-100 dark:text-slate-400">
              Hai già un account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-300 hover:text-blue-700 font-medium"
              >
                Accedi
              </button>
            </p>
            <p className="text-sm text-gray-100 dark:text-slate-400">
              Sei un istruttore?{' '}
              <button
                onClick={() => navigate('/login-instructor')}
                className="text-blue-300 hover:text-blue-700 font-medium"
              >
                Accedi come istruttore
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
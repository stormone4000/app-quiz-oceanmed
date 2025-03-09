import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle, Key, Info, X, Pencil } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { storageWrapper } from '../../services/storage-wrapper';
import { useNavigate } from 'react-router-dom';

interface StudentProfileProps {
  userEmail: string;
}

export function StudentProfile({ userEmail }: StudentProfileProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    masterCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'idle' | 'checking' | 'verifying' | 'success' | 'error'>('idle');

  // Funzione per caricare i dati del profilo utente
  const loadUserProfile = async () => {
    if (!userEmail) {
      console.log('Nessuna email utente fornita');
      return;
    }
    
    console.log('Caricamento profilo per email:', userEmail);
    
    try {
      setLoading(true);
      
      // Prima controlliamo se i dati sono disponibili nel localStorage
      const firstName = localStorage.getItem('firstName') || '';
      const lastName = localStorage.getItem('lastName') || '';
      
      console.log('Dati dal localStorage:', { firstName, lastName });
      
      if (firstName || lastName) {
        // Se abbiamo dati nel localStorage, li utilizziamo
        console.log('Utilizzo dati dal localStorage');
        setFormData(prev => ({
          ...prev,
          firstName,
          lastName
        }));
      } else {
        // Altrimenti, carichiamo i dati dal database
        console.log('Tentativo di caricamento dati dal database');
        
        // Utilizziamo una query RPC diretta per bypassare l'RLS
        try {
          const { data: userData, error: rpcError } = await supabase
            .rpc('get_user_profile', { user_email: userEmail });
          
          if (!rpcError && userData) {
            console.log('Dati ottenuti tramite RPC:', userData);
            
            // Salviamo i dati nel localStorage per usi futuri
            localStorage.setItem('firstName', userData.first_name || '');
            localStorage.setItem('lastName', userData.last_name || '');
            
            setFormData(prev => ({
              ...prev,
              firstName: userData.first_name || '',
              lastName: userData.last_name || ''
            }));
            return;
          } else {
            console.log('Errore RPC o nessun dato:', rpcError);
          }
        } catch (rpcErr) {
          console.error('Errore nella chiamata RPC:', rpcErr);
        }
        
        // Se la RPC fallisce, proviamo con una query diretta
        console.log('Tentativo con query diretta');
        const { data, error } = await supabase
          .from('auth_users')
          .select('first_name, last_name')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (error) {
          console.error('Errore nella query diretta:', error);
          throw error;
        }
        
        if (data) {
          console.log('Dati ottenuti tramite query diretta:', data);
          
          // Salviamo i dati nel localStorage per usi futuri
          localStorage.setItem('firstName', data.first_name || '');
          localStorage.setItem('lastName', data.last_name || '');
          
          setFormData(prev => ({
            ...prev,
            firstName: data.first_name || '',
            lastName: data.last_name || ''
          }));
        } else {
          console.log('Nessun dato trovato per l\'email:', userEmail);
          
          // Come ultima risorsa, proviamo a ottenere i dati dalla sessione
          const { data: { user } } = await supabase.auth.getUser();
          console.log('Dati utente dalla sessione:', user);
          
          if (user && user.email === userEmail) {
            const userMetadata = user.user_metadata || {};
            const firstName = userMetadata.first_name || '';
            const lastName = userMetadata.last_name || '';
            
            console.log('Dati ottenuti dalla sessione:', { firstName, lastName });
            
            // Salviamo i dati nel localStorage
            localStorage.setItem('firstName', firstName);
            localStorage.setItem('lastName', lastName);
            
            setFormData(prev => ({
              ...prev,
              firstName,
              lastName
            }));
          }
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento del profilo:', error);
      setError('Impossibile caricare i dati del profilo. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  // Carica i dati del profilo all'inizializzazione
  useEffect(() => {
    loadUserProfile();
  }, [userEmail]);

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isEditingPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Le nuove password non coincidono');
        }

        if (formData.newPassword.length < 8) {
          throw new Error('La nuova password deve essere di almeno 8 caratteri');
        }

        // Verify current password
        const currentPasswordHash = await hashPassword(formData.currentPassword);
        const { data: user, error: verifyError } = await supabase
          .from('auth_users')
          .select('id')
          .eq('email', userEmail)
          .eq('password_hash', currentPasswordHash)
          .single();

        if (verifyError || !user) {
          throw new Error('Password attuale non corretta');
        }

        // Update password
        const newPasswordHash = await hashPassword(formData.newPassword);
        const { error: updateError } = await supabase
          .from('auth_users')
          .update({ password_hash: newPasswordHash })
          .eq('email', userEmail);

        if (updateError) throw updateError;
      }

      // Update profile info
      const { error: updateError } = await supabase
        .from('auth_users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName
        })
        .eq('email', userEmail);

      if (updateError) throw updateError;

      // Aggiorniamo i dati nel localStorage
      localStorage.setItem('firstName', formData.firstName);
      localStorage.setItem('lastName', formData.lastName);

      setSuccess('Profilo aggiornato con successo');
      setIsEditingPassword(false);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'aggiornamento del profilo');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per verificare se un codice è attivo
  const checkActiveCode = async (code: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Verifica che il codice sia stato inserito
      if (!code || code.trim() === '') {
        setError('Inserisci un codice valido.');
        return false;
      }
      
      // Verifica se il codice inizia con "QUIZ-"
      if (code.startsWith('QUIZ-')) {
        setError('Questo è un codice per quiz. Per attivare un account istruttore, utilizza un codice istruttore valido.');
        return false;
      }
      
      // Verifica se il codice esiste e se è attivo
      const { data, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code)
        .single();
      
      if (codeError) {
        console.error('Errore durante la verifica del codice:', codeError);
        setError('Codice non valido o scaduto.');
        return false;
      }
      
      if (!data) {
        setError('Codice non trovato.');
        return false;
      }
      
      if (!data.is_active) {
        setError('Questo codice è stato disattivato.');
        return false;
      }
      
      // Verifica se il codice è scaduto
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('Questo codice è scaduto.');
        return false;
      }
      
      // Verifica se il codice è di tipo istruttore
      if (data.type !== 'instructor' && data.type !== 'master') {
        setError('Questo codice non è valido per attivare un account istruttore.');
        return false;
      }
      
      // Imposta i flag di accesso
      localStorage.setItem('hasActiveAccess', 'true');
      localStorage.setItem('hasInstructorAccess', 'true');
      localStorage.setItem('masterCode', code);
      localStorage.setItem('isProfessor', 'true');
      localStorage.setItem('isStudent', 'false');
      localStorage.setItem('needsSubscription', 'false');
      localStorage.setItem('isCodeDeactivated', 'false');
      
      // Trigger per aggiornare altri componenti
      window.dispatchEvent(new Event('localStorageUpdated'));
      
      return true;
    } catch (error) {
      console.error('Errore durante la verifica del codice:', error);
      setError('Errore durante la verifica del codice. Riprova più tardi.');
      return false;
    }
  };

  // Funzione per gestire l'invio del codice istruttore
  const handleMasterCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    setVerificationStep('checking');

    try {
      // Verifico che l'email dell'utente sia presente
      if (!userEmail) {
        setVerificationStep('error');
        throw new Error('Email utente non trovata. Effettua nuovamente il login.');
      }

      // Verifico che il codice master sia stato inserito
      if (!formData.masterCode || formData.masterCode.trim() === '') {
        setVerificationStep('error');
        throw new Error('Inserisci un codice istruttore valido.');
      }

      // Mostro un messaggio di verifica in corso
      setSuccess('Verifica del codice in corso...');
      
      // Utilizziamo la funzione checkActiveCode per verificare se il codice è valido
      const isCodeValid = await checkActiveCode(formData.masterCode);
      
      if (!isCodeValid) {
        setVerificationStep('error');
        // Non serve impostare un messaggio di errore qui perché checkActiveCode già lo imposta
        throw new Error('Codice non valido');
      }
      
      // Otteniamo i dettagli del codice dal database
      const { data: accessCode, error: accessCodeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', formData.masterCode)
        .single();
        
      if (accessCodeError) {
        console.error('Errore durante l\'ottenimento dei dettagli del codice:', accessCodeError);
        setVerificationStep('error');
        throw new Error('Errore durante la verifica del codice. Riprova più tardi.');
      }
      
      // Registra l'utilizzo del codice
      if (accessCode) {
        const { error: usageInsertError } = await supabase
          .from('access_code_usage')
          .insert({
            code_id: accessCode.id,
            student_email: userEmail,
            first_name: formData.firstName,
            last_name: formData.lastName
          });
          
        if (usageInsertError) {
          console.error('Errore durante la registrazione dell\'utilizzo del codice:', usageInsertError);
        }
      }
      
      setVerificationStep('success');
      setSuccess('Codice istruttore verificato con successo! Profilo istruttore attivato. Ricarica la pagina per accedere alle funzionalità da istruttore.');
      
      // Reindirizza alla dashboard dopo 3 secondi
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);
    } catch (error) {
      console.error('Errore durante la verifica del codice:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la verifica del codice');
      setVerificationStep('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!userEmail && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold mb-4 dark:text-white">Profilo Studente</h1>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Visualizza i dettagli del profilo studente
            </p>
          </div>
        </div>
      )}

      {userEmail && (
        <>
          {/* Profile Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 dark:text-slate-100 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              Il Tuo Profilo
            </h2>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                {success}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Nome
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      placeholder="Il tuo nome"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Cognome
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      placeholder="Il tuo cognome"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                <button
                  type="button"
                  onClick={() => setIsEditingPassword(!isEditingPassword)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-2"
                >
                  <Lock className="w-5 h-5" />
                  {isEditingPassword ? 'Annulla modifica password' : 'Modifica password'}
                </button>

                {isEditingPassword && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Password Attuale
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="password"
                          value={formData.currentPassword}
                          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                          className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          placeholder="Inserisci la password attuale"
                          required={isEditingPassword}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Nuova Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          placeholder="Inserisci la nuova password"
                          required={isEditingPassword}
                          minLength={8}
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        Minimo 8 caratteri
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Conferma Nuova Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          placeholder="Conferma la nuova password"
                          required={isEditingPassword}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
              </div>
            </form>
          </div>

          {/* Instructor Code Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 dark:text-slate-100 flex items-center gap-2">
              <Key className="w-6 h-6 text-blue-600" />
              Attiva Profilo Istruttore
            </h2>
            
            <p className="text-gray-700 dark:text-slate-300 mb-6">
              Se hai un codice istruttore, inseriscilo qui per attivare le funzionalità da istruttore.
            </p>
            
            <form onSubmit={handleMasterCodeSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Codice Istruttore
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.masterCode}
                    onChange={(e) => setFormData({ ...formData, masterCode: e.target.value })}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder="Inserisci il codice istruttore"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || verificationStep === 'success'}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>Verifica in corso...</>
                  ) : verificationStep === 'success' ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Codice Verificato
                    </>
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      Verifica Codice
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
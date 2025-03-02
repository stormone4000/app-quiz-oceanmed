import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle, Key, CreditCard } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { stripePromise, createCheckoutSession } from '../../services/stripe';
import { STRIPE_CONFIG } from '../../config/stripe';

interface InstructorProfileProps {
  userEmail: string;
  needsSubscription?: boolean;
}

export function InstructorProfile({ userEmail, needsSubscription }: InstructorProfileProps) {
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
  const [selectedPlan, setSelectedPlan] = useState<'month' | 'year'>('month');

  useEffect(() => {
    loadUserProfile();
  }, [userEmail]);

  const loadUserProfile = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('Utente non trovato');

      setFormData(prev => ({
        ...prev,
        firstName: userData.first_name || '',
        lastName: userData.last_name || ''
      }));
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Errore durante il caricamento del profilo');
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

  const handleMasterCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Get password hash from storage
      const passwordHash = localStorage.getItem('passwordHash');
      if (!passwordHash) {
        throw new Error('Credenziali non valide');
      }

      // Verify instructor credentials with master code
      const { data: users, error: verifyError } = await supabase
        .rpc('verify_instructor_credentials', {
          p_email: userEmail,
          p_password_hash: passwordHash,
          p_master_code: formData.masterCode
        });

      if (verifyError) throw verifyError;
      if (!users || users.length === 0) {
        throw new Error('Codice master non valido');
      }

      const user = users[0];
      if (user.subscription_status !== 'active') {
        throw new Error('Codice master non valido');
      }

      // Store master code in localStorage
      localStorage.setItem('masterCode', formData.masterCode);
      localStorage.setItem('hasActiveAccess', 'true');

      setSuccess('Codice master verificato con successo!');
      window.location.reload(); // Reload to update UI
    } catch (error) {
      console.error('Error verifying master code:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la verifica del codice');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get payment link based on selected plan
      const paymentLink = STRIPE_CONFIG.urls.paymentLinks.premium[selectedPlan];
      
      if (paymentLink) {
        window.location.href = paymentLink;
        return;
      }

      // Fallback to Stripe Checkout if no payment link exists
      const priceId = STRIPE_CONFIG.prices.premium[selectedPlan];
      const sessionId = await createCheckoutSession(priceId, userEmail);

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Errore durante il caricamento del sistema di pagamento');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;

    } catch (error) {
      console.error('Error initiating subscription:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'avvio dell\'abbonamento');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 dark:text-slate-100 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-600" />
          Profilo Istruttore
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

      {/* Master Code and Subscription Section for Instructors */}
      {needsSubscription && (
        <div className="space-y-6">
          {/* Master Code Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 dark:text-slate-100 flex items-center gap-2">
              <Key className="w-6 h-6 text-blue-600" />
              Codice Master
            </h3>
            <form onSubmit={handleMasterCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Inserisci il codice master
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.masterCode}
                    onChange={(e) => setFormData({ ...formData, masterCode: e.target.value })}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder="Inserisci il codice master"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !formData.masterCode}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Key className="w-5 h-5" />
                {loading ? 'Verifica in corso...' : 'Verifica Codice'}
              </button>
            </form>
          </div>

          {/* Subscription Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-600" />
              Abbonamento
            </h3>
            <div className="space-y-4">
              <div className="flex justify-center mb-8">
                <div className="bg-white rounded-full p-1 inline-flex">
                  <button
                    onClick={() => setSelectedPlan('month')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedPlan === 'month'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Mensile
                  </button>
                  <button
                    onClick={() => setSelectedPlan('year')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedPlan === 'year'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Annuale
                    <span className="ml-1 text-xs text-green-600">-20%</span>
                  </button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-3xl font-bold dark:text-slate-100">
                  €{selectedPlan === 'year' 
                    ? (29.99 * 0.8 * 12).toFixed(2) 
                    : '29.99'}
                </p>
                <p className="text-gray-600 dark:text-slate-400">
                  /{selectedPlan === 'year' ? 'anno' : 'mese'}
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Quiz di apprendimento illimitati
                </li>
                <li className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Simulazioni d'esame illimitate
                </li>
                <li className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Video lezioni avanzate
                </li>
                <li className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Supporto prioritario
                </li>
              </ul>

              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CreditCard className="w-5 h-5" />
                {loading ? 'Elaborazione...' : 'Attiva Abbonamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
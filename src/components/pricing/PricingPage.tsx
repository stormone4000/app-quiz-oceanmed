import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Lock, AlertCircle, Loader2, Compass, CheckCircle2, XCircle, RefreshCw, Calendar, CreditCard, Clock } from 'lucide-react';
import { stripePromise, createCheckoutSession } from '../../services/stripe';
import { motion, AnimatePresence } from 'framer-motion';
import { PricingFeatures } from './PricingFeatures';
import { supabase } from '../../services/supabase';
import { STRIPE_CONFIG } from '../../config/stripe';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  icon: React.ReactNode;
  description: string;
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'premium',
    name: 'Premium',
    price: 29.99,
    interval: 'month',
    icon: <Compass className="w-6 h-6 text-indigo-600" />,
    description: 'La scelta migliore per una preparazione completa',
    features: [
      'Quiz di apprendimento illimitati',
      'Simulazioni d\'esame illimitate',
      'Video lezioni avanzate',
      'Supporto prioritario',
      'Analisi dettagliata dei risultati',
      'Materiale didattico esclusivo'
    ],
    popular: true
  }
];

interface SubscriptionStatus {
  status: 'active' | 'inactive' | 'pending' | 'cancelled';
  expiresAt: string | null;
  plan: string | null;
}

export function PricingPage() {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
  const [verificationStep, setVerificationStep] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      setLoadingSubscription(true);
      const userEmail = localStorage.getItem('userEmail');
      
      if (!userEmail) {
        return;
      }

      // Verifica se l'utente ha un abbonamento attivo
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('customer_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(1);

      if (subscriptionError) throw subscriptionError;

      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];
        setSubscriptionStatus({
          status: subscription.status,
          expiresAt: subscription.current_period_end,
          plan: subscription.plan_id
        });
      } else {
        setSubscriptionStatus({
          status: 'inactive',
          expiresAt: null,
          plan: null
        });
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  // Funzione per formattare automaticamente il codice di accesso (XXXXX-XXXXX-XXXXX)
  const handleAccessCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Aggiungi automaticamente i trattini dopo 5 e 10 caratteri
    if (value.length > 5) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    }
    if (value.length > 11) {
      value = value.slice(0, 11) + '-' + value.slice(11);
    }
    
    // Limita la lunghezza a 17 caratteri (5+1+5+1+5)
    if (value.length > 17) {
      value = value.slice(0, 17);
    }
    
    setAccessCode(value);
  };

  const verifyAccessCode = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setVerificationStep('checking');

      if (!accessCode.trim()) {
        setVerificationStep('error');
        throw new Error('Inserisci un codice di accesso');
      }

      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        setVerificationStep('error');
        throw new Error('Sessione utente non valida. Effettua nuovamente il login.');
      }

      // Mostro un messaggio di verifica in corso
      setSuccess('Verifica del codice in corso...');

      // Check if code exists and is valid
      const { data: codeData, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', accessCode.trim())
        .eq('is_active', true)
        .single();

      if (codeError || !codeData) {
        setVerificationStep('error');
        throw new Error('Codice di accesso non valido o inesistente');
      }

      // Check if code is expired
      if (codeData.expiration_date && new Date(codeData.expiration_date) < new Date()) {
        setVerificationStep('error');
        throw new Error('Codice di accesso scaduto. Contatta l\'amministratore.');
      }

      // For one-time codes, check if already used
      if (codeData.type === 'one_time') {
        const { data: usageData } = await supabase
          .from('access_code_usage')
          .select('id')
          .eq('code_id', codeData.id);

        if (usageData && usageData.length > 0) {
          setVerificationStep('error');
          throw new Error('Codice di accesso già utilizzato. Ogni codice può essere usato una sola volta.');
        }
      }

      // Aggiorno il messaggio di successo
      setSuccess('Codice valido! Attivazione abbonamento in corso...');

      // Record code usage
      const { error: usageError } = await supabase
        .from('access_code_usage')
        .insert([{
          code_id: codeData.id,
          student_email: userEmail,
          used_at: new Date().toISOString()
        }]);

      if (usageError) {
        setVerificationStep('error');
        throw usageError;
      }

      // Create subscription with Premium monthly plan
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert([{
          customer_email: userEmail,
          subscription_id: `sub_${Date.now()}`,
          plan_id: STRIPE_CONFIG.prices.premium.month,
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
          billing_interval: 'month',
          access_code_id: codeData.id
        }]);

      if (subscriptionError) {
        setVerificationStep('error');
        throw subscriptionError;
      }
      
      // Update local storage
      localStorage.setItem('hasActiveAccess', 'true');

      setVerificationStep('success');
      setSuccess('Codice verificato con successo! Reindirizzamento alla dashboard...');

      // Force a window reload after a brief delay to ensure all state is updated
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);

    } catch (error) {
      console.error('Error verifying code:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la verifica del codice');
      setVerificationStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(true);
      setError(null);

      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('Sessione utente non valida');
      }

      // Get payment link
      const paymentLink = STRIPE_CONFIG.urls.paymentLinks.premium[selectedInterval];
      
      if (paymentLink) {
        window.location.href = paymentLink;
        return;
      }

      // Fallback to Stripe Checkout if no payment link exists
      const priceId = STRIPE_CONFIG.prices.premium[selectedInterval];
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Inizia il tuo percorso
          </h1>
          <p className="text-xl text-blue-100">
            Scegli il piano più adatto alle tue esigenze o inserisci un codice di accesso
          </p>
        </div>

        {/* Subscription Status */}
        {subscriptionStatus && (
          <div className="max-w-md mx-auto mb-8">
            <div className={`rounded-xl shadow-lg p-6 ${
              subscriptionStatus.status === 'active' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-white'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${
                  subscriptionStatus.status === 'active' 
                    ? 'bg-green-100' 
                    : 'bg-gray-100'
                }`}>
                  <CreditCard className={`w-6 h-6 ${
                    subscriptionStatus.status === 'active' 
                      ? 'text-green-600' 
                      : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h2 className="text-xl text-gray-900 font-bold">Stato Abbonamento</h2>
                  <p className="text-sm text-gray-600">
                    {loadingSubscription 
                      ? 'Verifica in corso...' 
                      : subscriptionStatus.status === 'active'
                        ? 'Abbonamento attivo'
                        : 'Nessun abbonamento attivo'
                    }
                  </p>
                </div>
              </div>

              {!loadingSubscription && (
                <div className="space-y-2">
                  {subscriptionStatus.status === 'active' && (
                    <>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-5 h-5 text-green-600" />
                        <span>
                          Scadenza: {subscriptionStatus.expiresAt ? formatDate(subscriptionStatus.expiresAt) : 'Non specificata'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-5 h-5 text-green-600" />
                        <span>
                          Piano: {subscriptionStatus.plan === STRIPE_CONFIG.prices.premium.month 
                            ? 'Premium Mensile' 
                            : subscriptionStatus.plan === STRIPE_CONFIG.prices.premium.year
                              ? 'Premium Annuale'
                              : 'Piano personalizzato'
                          }
                        </span>
                      </div>
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => navigate('/dashboard')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Vai alla Dashboard
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Access Code Section */}
        <div className="max-w-md mx-auto mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Key className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl text-gray-900 font-bold">Hai un codice?</h2>
                <p className="text-sm text-gray-600">Accedi subito con il tuo codice</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codice di Accesso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={accessCode}
                    onChange={handleAccessCodeChange}
                    className={`text-gray-900 w-full pl-12 pr-10 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg tracking-wider ${
                      verificationStep === 'error' 
                        ? 'border-red-500' 
                        : verificationStep === 'success'
                          ? 'border-green-500'
                          : 'border-gray-300'
                    }`}
                    placeholder="XXXXX-XXXXX-XXXXX"
                    maxLength={17}
                  />
                  {verificationStep === 'checking' && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {verificationStep === 'success' && (
                    <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 w-5 h-5" />
                  )}
                  {verificationStep === 'error' && (
                    <XCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5" />
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Inserisci il codice nel formato XXXXX-XXXXX-XXXXX
                </p>
              </div>

              <button
                onClick={verifyAccessCode}
                disabled={loading || accessCode.length < 15}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verificationStep === 'checking' ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Key className="w-5 h-5" />
                )}
                {loading 
                  ? 'Verifica in corso...' 
                  : verificationStep === 'success'
                    ? 'Attivazione in corso...'
                    : 'Verifica Codice'
                }
              </button>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-2"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white rounded-full p-1 inline-flex">
            <button
              onClick={() => setSelectedInterval('month')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedInterval === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mensile
            </button>
            <button
              onClick={() => setSelectedInterval('year')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedInterval === 'year'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annuale
              <span className="ml-1 text-xs text-green-600">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-lg mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                plan.popular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="bg-blue-600 text-white text-center text-sm py-1">
                  Piano Consigliato
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-3xl font-bold">
                    €{selectedInterval === 'year' 
                      ? (plan.price * 0.8 * 12).toFixed(2) 
                      : plan.price.toFixed(2)}
                  </p>
                  <p className="text-gray-600">
                    /{selectedInterval === 'year' ? 'anno' : 'mese'}
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading}
                  className={`w-full py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Elaborazione...
                    </>
                  ) : (
                    <>
                      <Compass className="w-5 h-5" />
                      Inizia Ora
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <PricingFeatures />

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Hai delle domande?
          </h2>
          <p className="text-blue-100 mb-4">
            Contattaci per qualsiasi chiarimento
          </p>
          <a
            href="mailto:support@oceanmedsailing.com"
            className="inline-flex items-center gap-2 text-white hover:text-blue-200 transition-colors"
          >
            support@oceanmedsailing.com
          </a>
        </div>
      </div>
    </div>
  );
}
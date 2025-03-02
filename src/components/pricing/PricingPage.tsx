import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Lock, AlertCircle, Loader2, Compass, CheckCircle2 } from 'lucide-react';
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

export function PricingPage() {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
  const navigate = useNavigate();

  const verifyAccessCode = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!accessCode.trim()) {
        throw new Error('Inserisci un codice di accesso');
      }

      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('Sessione utente non valida');
      }

      // Check if code exists and is valid
      const { data: codeData, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', accessCode.trim())
        .eq('is_active', true)
        .single();

      if (codeError || !codeData) {
        throw new Error('Codice di accesso non valido');
      }

      // Check if code is expired
      if (codeData.expiration_date && new Date(codeData.expiration_date) < new Date()) {
        throw new Error('Codice di accesso scaduto');
      }

      // For one-time codes, check if already used
      if (codeData.type === 'one_time') {
        const { data: usageData } = await supabase
          .from('access_code_usage')
          .select('id')
          .eq('code_id', codeData.id);

        if (usageData && usageData.length > 0) {
          throw new Error('Codice di accesso già utilizzato');
        }
      }

      // Record code usage
      const { error: usageError } = await supabase
        .from('access_code_usage')
        .insert([{
          code_id: codeData.id,
          student_email: userEmail,
          used_at: new Date().toISOString()
        }]);

      if (usageError) throw usageError;

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

      if (subscriptionError) throw subscriptionError;
      
      // Update local storage
      localStorage.setItem('hasActiveAccess', 'true');

      setSuccess('Codice verificato con successo! Reindirizzamento...');

      // Force a window reload after a brief delay to ensure all state is updated
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);

    } catch (error) {
      console.error('Error verifying code:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la verifica del codice');
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
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="text-gray-900 w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Inserisci il codice di accesso"
                />
              </div>

              <button
                onClick={verifyAccessCode}
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
                    <Key className="w-5 h-5" />
                    Verifica Codice
                  </>
                )}
              </button>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    {success}
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
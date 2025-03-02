import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabase';
import { STRIPE_CONFIG } from '../config/stripe';

// Initialize Stripe with public key
export const stripePromise = loadStripe(STRIPE_CONFIG.publishableKey, {
  locale: 'it'
});

// Create checkout session
export const createCheckoutSession = async (planId: string, customerEmail: string): Promise<string> => {
  try {
    // Validate inputs
    if (!planId || !customerEmail) {
      throw new Error('Piano e email sono richiesti');
    }

    // Get price ID based on plan and interval
    const [plan, interval] = planId.split('-');
    const priceId = STRIPE_CONFIG.prices[plan as keyof typeof STRIPE_CONFIG.prices]?.[
      interval as 'month' | 'year'
    ];

    if (!priceId) {
      throw new Error('Piano non valido');
    }

    // Create checkout session
    const response = await fetch(`${STRIPE_CONFIG.urls.checkout}/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        priceId, 
        customerEmail,
        successUrl: `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/pricing?canceled=true`
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Errore durante la creazione della sessione di pagamento');
    }

    const { sessionId } = await response.json();
    if (!sessionId) {
      throw new Error('Session ID non valido');
    }

    return sessionId;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Verify subscription status
export const verifySubscriptionStatus = async (customerEmail: string): Promise<boolean> => {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('customer_email', customerEmail)
      .eq('status', 'active')
      .single();

    if (error) throw error;
    return !!subscription;
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return false;
  }
};

// Handle successful subscription
export const handleSubscriptionSuccess = async (sessionId: string): Promise<void> => {
  try {
    const response = await fetch('/api/stripe/subscription-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Errore durante la verifica dell\'abbonamento');
    }

    // Update localStorage
    localStorage.setItem('hasActiveAccess', 'true');
    
    // Force reload user role in App component
    window.dispatchEvent(new Event('storage'));

  } catch (error) {
    console.error('Error handling subscription success:', error);
    throw error;
  }
};
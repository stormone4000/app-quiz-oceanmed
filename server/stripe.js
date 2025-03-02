import Stripe from 'stripe';
import express from 'express';
import { supabase } from '../src/services/supabase.js';

const router = express.Router();

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

// Webhook secret from environment variable
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Create Checkout Session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, customerEmail, successUrl, cancelUrl } = req.body;

    // Validate required fields
    if (!priceId || !customerEmail) {
      return res.status(400).json({ 
        error: 'Prezzo e email sono richiesti' 
      });
    }

    // Create the session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.DOMAIN}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.DOMAIN}/pricing?canceled=true`,
      customer_email: customerEmail,
      metadata: {
        customerEmail,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      payment_method_collection: 'if_required',
      locale: 'it',
      custom_text: {
        submit: {
          message: 'La tua iscrizione inizierà subito dopo il pagamento.'
        }
      }
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      error: error.message || 'Errore durante la creazione della sessione di pagamento' 
    });
  }
});

// Change subscription plan
router.post('/change-plan', async (req, res) => {
  try {
    const { subscriptionId, newPlanId } = req.body;

    if (!subscriptionId || !newPlanId) {
      return res.status(400).json({ error: 'Subscription ID e nuovo piano sono richiesti' });
    }

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPlanId,
      }],
      proration_behavior: 'create_prorations',
    });

    // Update subscription in Supabase
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: newPlanId,
        current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        billing_interval: updatedSubscription.items.data[0].plan.interval
      })
      .eq('subscription_id', subscriptionId);

    if (updateError) throw updateError;

    // Log subscription change
    await supabase
      .from('subscription_changes')
      .insert({
        customer_email: subscription.metadata.customerEmail,
        subscription_id: subscriptionId,
        change_type: 'updated',
        old_plan: subscription.items.data[0].price.id,
        new_plan: newPlanId
      });

    return res.status(200).json({ subscription: updatedSubscription });
  } catch (error) {
    console.error('Error changing subscription plan:', error);
    return res.status(500).json({ 
      error: error.message || 'Errore durante il cambio del piano' 
    });
  }
});

// Verify subscription status
router.post('/subscription-status', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID richiesto' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    return res.status(200).json({
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
    });
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return res.status(500).json({ 
      error: error.message || 'Errore durante la verifica dell\'abbonamento' 
    });
  }
});

// Webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'Stripe signature required' });
    }

    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.metadata?.customerEmail;
        const subscriptionId = session.subscription;

        if (!customerEmail || !subscriptionId) {
          throw new Error('Missing required metadata');
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const planId = subscription.items.data[0].price.id;
        const planInterval = subscription.items.data[0].price.recurring?.interval || 'month';

        // Update user subscription in Supabase
        const { error: updateError } = await supabase
          .from('subscriptions')
          .upsert({
            customer_email: customerEmail,
            subscription_id: subscriptionId,
            plan_id: planId,
            status: 'active',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            billing_interval: planInterval
          });

        if (updateError) throw updateError;
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({
      error: error.message || 'Webhook error'
    });
  }
});

export default router;
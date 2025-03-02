import Stripe from 'stripe';
import { supabase } from './supabase';

// Initialize Stripe
const stripe = new Stripe('sk_test_51QkrucGjHuDDhWuCUZiR9kX8whPnshRc72GQTOZb8qTfev5wrJbFv0cwDVDx1f7ni7ukJXaiqcCeRyz1jWe1VUQf00tOKn3IEs', {
  apiVersion: '2023-10-16'
});

export async function handleStripeWebhook(event: Stripe.Event) {
  try {
    switch (event.type) {
      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer;
        const { error } = await supabase
          .from('customers')
          .insert({
            id: customer.metadata.user_id,
            stripe_customer_id: customer.id
          });
        
        if (error) throw error;
        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        if (paymentMethod.type !== 'card') break;

        const { error } = await supabase
          .from('customer_payment_methods')
          .insert({
            customer_id: paymentMethod.metadata.user_id,
            stripe_payment_method_id: paymentMethod.id,
            card_brand: paymentMethod.card?.brand,
            card_last4: paymentMethod.card?.last4,
            card_exp_month: paymentMethod.card?.exp_month,
            card_exp_year: paymentMethod.card?.exp_year,
            is_default: true
          });

        if (error) throw error;
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.metadata?.customerEmail;
        const subscriptionId = session.subscription;

        if (!customerEmail || !subscriptionId) {
          throw new Error('Missing required metadata');
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
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

        // Log subscription change
        await supabase
          .from('subscription_changes')
          .insert({
            customer_email: customerEmail,
            subscription_id: subscriptionId,
            change_type: 'created',
            new_plan: planId
          });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerEmail = subscription.metadata?.customerEmail;

        if (!customerEmail) {
          throw new Error('Customer email not found in metadata');
        }

        // Update subscription in Supabase
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end
          })
          .eq('subscription_id', subscription.id);

        if (updateError) throw updateError;

        // Log subscription change
        await supabase
          .from('subscription_changes')
          .insert({
            customer_email: customerEmail,
            subscription_id: subscription.id,
            change_type: 'updated',
            old_plan: subscription.metadata?.old_plan,
            new_plan: subscription.items.data[0].price.id
          });

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerEmail = subscription.metadata?.customerEmail;

        if (!customerEmail) {
          throw new Error('Customer email not found in metadata');
        }

        // Update subscription status
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('subscription_id', subscription.id);

        if (updateError) throw updateError;

        // Log subscription change
        await supabase
          .from('subscription_changes')
          .insert({
            customer_email: customerEmail,
            subscription_id: subscription.id,
            change_type: 'canceled'
          });

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) return;

        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const customerEmail = subscription.metadata?.customerEmail;

        if (!customerEmail) {
          throw new Error('Customer email not found in metadata');
        }

        // Log successful payment
        await supabase
          .from('subscription_events')
          .insert({
            subscription_id: subscription.id,
            event_type: 'payment_succeeded',
            metadata: {
              amount: invoice.amount_paid,
              invoice_id: invoice.id
            }
          });

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) return;

        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const customerEmail = subscription.metadata?.customerEmail;

        if (!customerEmail) {
          throw new Error('Customer email not found in metadata');
        }

        // Update subscription status
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('subscription_id', subscription.id);

        // Log failed payment
        await supabase
          .from('subscription_events')
          .insert({
            subscription_id: subscription.id,
            event_type: 'payment_failed',
            metadata: {
              attempt_count: invoice.attempt_count,
              next_payment_attempt: invoice.next_payment_attempt
            }
          });

        // Create notification for user
        await supabase
          .from('notifications')
          .insert({
            title: 'Pagamento Fallito',
            content: 'Il pagamento del tuo abbonamento non è andato a buon fine. Per favore verifica il metodo di pagamento.',
            category: 'alert',
            is_important: true,
            student_email: customerEmail
          });

        break;
      }
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
}
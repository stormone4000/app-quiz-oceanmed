export const STRIPE_CONFIG = {
  // Public key for client-side
  publishableKey: 'pk_test_51QlRz3Gf5pX8MMrkFbrGeFdtbgMyuucksleApw9zHBVShH9leEXmPS8udu0vNjampZvUScGpYnEWI3ADwusWK1Mo00toFNioS5',
  
  // Product/Price IDs
  prices: {
    premium: {
      month: 'price_1QlS7tGf5pX8MMrk12g0xyCw',
      year: 'price_1QlS8EGf5pX8MMrkriZslU3Q'
    }
  },

  // Stripe hosted pages
  urls: {
    checkout: 'https://api.stripe.com/v1',
    customerPortal: 'https://billing.stripe.com',
    paymentLinks: {
      premium: {
        month: 'https://buy.stripe.com/test_28o00ngRX0gbfoAeUX',
        year: 'https://buy.stripe.com/test_cN25kHdFL0gb4JW8wy'
      }
    }
  }
};

// Plan name mapping
export const PLAN_NAMES: { [key: string]: string } = {
  'price_1QlS7tGf5pX8MMrk12g0xyCw': 'Premium Mensile', 
  'price_1QlS8EGf5pX8MMrkriZslU3Q': 'Premium Annuale'
};
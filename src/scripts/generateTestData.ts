import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.HtnIuP5YJRkzfHuHYqYyKbyIFoSHW67m2wqdVxdL8Wc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Plan configurations
const PLANS = {
  BASE: {
    id: 'base',
    prices: {
      month: 'price_1QkuALGjHuDDhWuCeOfzeJ6z',
      year: 'price_1QkuALGjHuDDhWuCVxlfRnB0'
    }
  },
  PREMIUM: {
    id: 'premium',
    prices: {
      month: 'price_1QkuB5GjHuDDhWuCeWocqn8W',
      year: 'price_1QkuBwGjHuDDhWuCoGF52YkA'
    }
  },
  PRO: {
    id: 'pro',
    prices: {
      month: 'price_1QkuCaGjHuDDhWuCO0N9TeZf',
      year: 'price_1QkuD1GjHuDDhWuCHVHi7oNj'
    }
  }
};

// Subscription statuses
const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'canceled', 'incomplete'] as const;

// Helper function to generate random date within a range
const randomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper function to generate random subscription
const generateSubscription = (email: string) => {
  const plans = [PLANS.BASE, PLANS.PREMIUM, PLANS.PRO];
  const intervals = ['month', 'year'] as const;
  const plan = plans[Math.floor(Math.random() * plans.length)];
  const interval = intervals[Math.floor(Math.random() * intervals.length)];
  const status = SUBSCRIPTION_STATUSES[Math.floor(Math.random() * SUBSCRIPTION_STATUSES.length)];
  
  const startDate = randomDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), new Date());
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (interval === 'month' ? 30 : 365));

  return {
    customer_email: email,
    subscription_id: `sub_${Math.random().toString(36).substr(2, 9)}`,
    plan_id: plan.prices[interval],
    status,
    current_period_end: endDate.toISOString(),
    cancel_at_period_end: Math.random() > 0.7,
    interval,
    created_at: startDate.toISOString()
  };
};

// Helper function to generate random access code
const generateAccessCode = (index: number) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const isUsed = index % 2 === 0; // 50% used, 50% unused
  const createdDate = randomDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), new Date());
  
  return {
    code,
    type: 'one_time',
    expiration_date: new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: !isUsed,
    created_at: createdDate.toISOString()
  };
};

// Main function to generate and insert test data
export const generateTestData = async () => {
  try {
    console.log('Starting test data generation...');

    // Get existing users
    const { data: users, error: usersError } = await supabase
      .from('auth_users')
      .select('email');

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      throw new Error('No users found in the database');
    }

    console.log(`Found ${users.length} users`);

    // Generate and insert subscriptions
    const subscriptions = users.map(user => generateSubscription(user.email));
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert(subscriptions);

    if (subscriptionError) throw subscriptionError;
    console.log(`Generated ${subscriptions.length} subscriptions`);

    // Generate and insert access codes
    const accessCodes = Array.from({ length: 50 }, (_, i) => generateAccessCode(i));
    const { data: insertedCodes, error: codesError } = await supabase
      .from('access_codes')
      .insert(accessCodes)
      .select();

    if (codesError) throw codesError;
    console.log(`Generated ${accessCodes.length} access codes`);

    // Generate usage data for used codes
    if (insertedCodes) {
      const usedCodes = insertedCodes.filter((_, i) => i % 2 === 0);
      const usageData = usedCodes.map(code => {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        return {
          code_id: code.id,
          student_email: randomUser.email,
          used_at: randomDate(new Date(code.created_at), new Date()).toISOString()
        };
      });

      const { error: usageError } = await supabase
        .from('access_code_usage')
        .insert(usageData);

      if (usageError) throw usageError;
      console.log(`Generated ${usageData.length} access code usage records`);
    }

    console.log('Test data generation completed successfully!');
    return true;
  } catch (error) {
    console.error('Error generating test data:', error);
    throw error;
  }
};
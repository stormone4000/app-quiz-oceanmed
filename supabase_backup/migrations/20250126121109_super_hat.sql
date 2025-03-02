-- Update subscription for test user pro@pro.it
UPDATE subscriptions
SET 
  plan_id = 'price_1QlS7tGf5pX8MMrk12g0xyCw',
  billing_interval = 'month',
  status = 'active',
  current_period_end = (CURRENT_TIMESTAMP + INTERVAL '1 month'),
  cancel_at_period_end = false
WHERE customer_email = 'pro@pro.it';

-- If no subscription exists, create one
INSERT INTO subscriptions (
  customer_email,
  subscription_id,
  plan_id,
  status,
  current_period_end,
  cancel_at_period_end,
  billing_interval
)
SELECT 
  'pro@pro.it',
  'sub_test_' || gen_random_uuid(),
  'price_1QlS7tGf5pX8MMrk12g0xyCw',
  'active',
  (CURRENT_TIMESTAMP + INTERVAL '1 month'),
  false,
  'month'
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE customer_email = 'pro@pro.it'
);
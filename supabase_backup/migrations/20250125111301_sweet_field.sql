-- Insert test subscription for pro@pro.it
INSERT INTO subscriptions (
  customer_email,
  subscription_id,
  plan_id,
  status,
  current_period_end,
  cancel_at_period_end,
  interval
) VALUES (
  'pro@pro.it',
  'sub_test123',
  'price_1QkuCaGjHuDDhWuCO0N9TeZf', -- Pro plan monthly
  'active',
  (CURRENT_TIMESTAMP + INTERVAL '1 month'),
  false,
  'month'
);

-- Insert subscription change record
INSERT INTO subscription_changes (
  customer_email,
  subscription_id,
  change_type,
  new_plan,
  date
) VALUES (
  'pro@pro.it',
  'sub_test123',
  'created',
  'Pro Monthly',
  CURRENT_TIMESTAMP
);
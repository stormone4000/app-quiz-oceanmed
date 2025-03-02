-- Add billing_interval column to subscriptions table
ALTER TABLE subscriptions 
RENAME COLUMN interval TO billing_interval;

-- Update subscription manager query
CREATE OR REPLACE FUNCTION get_subscription_with_user(p_email text)
RETURNS TABLE (
  id uuid,
  customer_email text,
  subscription_id text,
  plan_id text,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  billing_interval text,
  created_at timestamptz,
  user_id uuid,
  first_name text,
  last_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.customer_email,
    s.subscription_id,
    s.plan_id,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end,
    s.billing_interval,
    s.created_at,
    s.user_id,
    au.first_name,
    au.last_name
  FROM subscriptions s
  LEFT JOIN auth_users au ON s.user_id = au.id
  WHERE s.customer_email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS subscriptions_billing_interval_idx ON subscriptions(billing_interval);
CREATE INDEX IF NOT EXISTS subscriptions_customer_email_status_idx ON subscriptions(customer_email, status);
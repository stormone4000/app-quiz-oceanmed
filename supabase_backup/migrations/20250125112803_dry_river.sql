-- Add foreign key relationship between subscriptions and auth_users
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth_users(id);

-- Update existing subscriptions to link with auth_users
DO $$
BEGIN
  UPDATE subscriptions s
  SET user_id = au.id
  FROM auth_users au
  WHERE s.customer_email = au.email;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);

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
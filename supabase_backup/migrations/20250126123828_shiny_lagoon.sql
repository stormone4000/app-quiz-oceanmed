-- Add relationship between subscriptions and access codes
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS access_code_id uuid REFERENCES access_codes(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS subscriptions_access_code_id_idx ON subscriptions(access_code_id);

-- Update the SubscriptionManager query
CREATE OR REPLACE FUNCTION get_subscription_with_details(p_email text)
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
  payment_method_id text,
  payment_method_last4 text,
  payment_method_brand text,
  payment_method_exp_month integer,
  payment_method_exp_year integer,
  notes text,
  access_code_id uuid,
  user_first_name text,
  user_last_name text,
  access_code text,
  access_code_expiration timestamptz,
  access_code_is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.*,
    au.first_name as user_first_name,
    au.last_name as user_last_name,
    ac.code as access_code,
    ac.expiration_date as access_code_expiration,
    ac.is_active as access_code_is_active
  FROM subscriptions s
  LEFT JOIN auth_users au ON s.customer_email = au.email
  LEFT JOIN access_codes ac ON s.access_code_id = ac.id
  WHERE s.customer_email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Update existing subscriptions to link with access codes
DO $$
DECLARE
  sub RECORD;
  code_id uuid;
BEGIN
  FOR sub IN SELECT * FROM subscriptions LOOP
    -- Find matching access code usage
    SELECT ac.id INTO code_id
    FROM access_codes ac
    JOIN access_code_usage acu ON ac.id = acu.code_id
    WHERE acu.student_email = sub.customer_email
    ORDER BY acu.used_at DESC
    LIMIT 1;

    -- Update subscription if access code found
    IF code_id IS NOT NULL THEN
      UPDATE subscriptions
      SET access_code_id = code_id
      WHERE id = sub.id;
    END IF;
  END LOOP;
END $$;
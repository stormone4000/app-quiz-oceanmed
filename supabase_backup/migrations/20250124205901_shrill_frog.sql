-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text NOT NULL,
  subscription_id text NOT NULL UNIQUE,
  plan_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view own subscriptions"
  ON subscriptions FOR SELECT
  TO public
  USING (customer_email = auth.email());

CREATE POLICY "Public can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO public
  USING (customer_email = auth.email())
  WITH CHECK (customer_email = auth.email());

-- Create indexes
CREATE INDEX subscriptions_customer_email_idx ON subscriptions(customer_email);
CREATE INDEX subscriptions_subscription_id_idx ON subscriptions(subscription_id);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);
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

-- Create subscription_changes table for history tracking
CREATE TABLE IF NOT EXISTS subscription_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text NOT NULL,
  subscription_id text NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('created', 'updated', 'canceled', 'renewed')),
  old_plan text,
  new_plan text,
  date timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_changes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view own subscriptions"
  ON subscriptions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO public
  USING (customer_email = auth.email())
  WITH CHECK (customer_email = auth.email());

CREATE POLICY "Public can view own subscription changes"
  ON subscription_changes FOR SELECT
  TO public
  USING (true);

-- Create indexes
CREATE INDEX subscriptions_customer_email_idx ON subscriptions(customer_email);
CREATE INDEX subscriptions_subscription_id_idx ON subscriptions(subscription_id);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);
CREATE INDEX subscription_changes_customer_email_idx ON subscription_changes(customer_email);
CREATE INDEX subscription_changes_subscription_id_idx ON subscription_changes(subscription_id);
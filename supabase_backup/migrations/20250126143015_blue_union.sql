-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Public can update own subscriptions" ON subscriptions;

-- Create new policies with proper permissions
CREATE POLICY "Public can view subscriptions"
  ON subscriptions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert subscriptions"
  ON subscriptions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update subscriptions"
  ON subscriptions FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS subscriptions_customer_email_status_idx ON subscriptions(customer_email, status);
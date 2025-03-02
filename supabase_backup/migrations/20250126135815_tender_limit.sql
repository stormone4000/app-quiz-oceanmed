-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view subscription changes" ON subscription_changes;
DROP POLICY IF EXISTS "Public can insert subscription changes" ON subscription_changes;
DROP POLICY IF EXISTS "Public can update subscription changes" ON subscription_changes;

-- Create new policies with proper permissions
CREATE POLICY "Public can view subscription changes"
  ON subscription_changes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert subscription changes"
  ON subscription_changes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update subscription changes"
  ON subscription_changes FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS subscription_changes_customer_email_idx ON subscription_changes(customer_email);
CREATE INDEX IF NOT EXISTS subscription_changes_subscription_id_idx ON subscription_changes(subscription_id);
CREATE INDEX IF NOT EXISTS subscription_changes_date_idx ON subscription_changes(date);
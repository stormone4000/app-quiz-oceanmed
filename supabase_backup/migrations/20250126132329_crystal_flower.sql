-- Add access code duration tracking
ALTER TABLE access_codes
ADD COLUMN IF NOT EXISTS duration_months integer,
ADD COLUMN IF NOT EXISTS duration_type text CHECK (duration_type IN ('fixed', 'unlimited'));

-- Add function to automatically update access code expiration based on subscription
CREATE OR REPLACE FUNCTION update_access_code_expiration()
RETURNS trigger AS $$
BEGIN
  -- Calculate expiration date based on subscription billing interval
  IF NEW.billing_interval = 'month' THEN
    UPDATE access_codes
    SET 
      expiration_date = NEW.current_period_end,
      duration_months = 1,
      duration_type = 'fixed'
    WHERE id = NEW.access_code_id;
  ELSIF NEW.billing_interval = 'year' THEN
    UPDATE access_codes
    SET 
      expiration_date = NEW.current_period_end,
      duration_months = 12,
      duration_type = 'fixed'
    WHERE id = NEW.access_code_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update access code expiration when subscription changes
DROP TRIGGER IF EXISTS update_access_code_expiration_trigger ON subscriptions;
CREATE TRIGGER update_access_code_expiration_trigger
  AFTER INSERT OR UPDATE OF current_period_end, billing_interval
  ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_access_code_expiration();

-- Update existing access codes with duration info based on subscriptions
DO $$
DECLARE
  sub RECORD;
BEGIN
  FOR sub IN SELECT * FROM subscriptions WHERE access_code_id IS NOT NULL LOOP
    UPDATE access_codes
    SET 
      duration_months = CASE 
        WHEN sub.billing_interval = 'month' THEN 1
        WHEN sub.billing_interval = 'year' THEN 12
        ELSE NULL
      END,
      duration_type = 'fixed',
      expiration_date = sub.current_period_end
    WHERE id = sub.access_code_id;
  END LOOP;
END $$;
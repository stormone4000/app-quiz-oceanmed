-- Add payment_method columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS payment_method_id text,
ADD COLUMN IF NOT EXISTS payment_method_last4 text,
ADD COLUMN IF NOT EXISTS payment_method_brand text,
ADD COLUMN IF NOT EXISTS payment_method_exp_month integer,
ADD COLUMN IF NOT EXISTS payment_method_exp_year integer;

-- Create index for payment method lookup
CREATE INDEX IF NOT EXISTS subscriptions_payment_method_idx ON subscriptions(payment_method_id);
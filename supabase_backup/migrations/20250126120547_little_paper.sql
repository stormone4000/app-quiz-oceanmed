-- Drop existing table if it exists
DROP TABLE IF EXISTS customer_payment_methods CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Create customers table
CREATE TABLE customers (
  email text PRIMARY KEY,
  stripe_customer_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create customer_payment_methods table
CREATE TABLE customer_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text REFERENCES customers(email) ON DELETE CASCADE,
  stripe_payment_method_id text NOT NULL,
  card_brand text,
  card_last4 text,
  card_exp_month integer,
  card_exp_year integer,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view customers"
  ON customers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert customers"
  ON customers FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update customers"
  ON customers FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view payment methods"
  ON customer_payment_methods FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert payment methods"
  ON customer_payment_methods FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update payment methods"
  ON customer_payment_methods FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX customers_stripe_customer_id_idx ON customers(stripe_customer_id);
CREATE INDEX customer_payment_methods_customer_email_idx ON customer_payment_methods(customer_email);
CREATE INDEX customer_payment_methods_stripe_id_idx ON customer_payment_methods(stripe_payment_method_id);
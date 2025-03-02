-- Create customers table for Stripe integration
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY REFERENCES auth_users(id),
  stripe_customer_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Create customer_payment_methods table
CREATE TABLE IF NOT EXISTS customer_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
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
CREATE POLICY "Public can view own customer data"
  ON customers FOR SELECT
  TO public
  USING (id = auth.uid());

CREATE POLICY "Public can update own customer data"
  ON customers FOR UPDATE
  TO public
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Public can view own payment methods"
  ON customer_payment_methods FOR SELECT
  TO public
  USING (customer_id = auth.uid());

-- Create indexes
CREATE INDEX customers_stripe_customer_id_idx ON customers(stripe_customer_id);
CREATE INDEX customer_payment_methods_customer_id_idx ON customer_payment_methods(customer_id);
CREATE INDEX customer_payment_methods_stripe_id_idx ON customer_payment_methods(stripe_payment_method_id);

-- Create function to get customer with payment methods
CREATE OR REPLACE FUNCTION get_customer_with_payment_methods(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  stripe_customer_id text,
  payment_methods jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.stripe_customer_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', pm.id,
          'stripe_id', pm.stripe_payment_method_id,
          'brand', pm.card_brand,
          'last4', pm.card_last4,
          'exp_month', pm.card_exp_month,
          'exp_year', pm.card_exp_year,
          'is_default', pm.is_default
        )
      ) FILTER (WHERE pm.id IS NOT NULL),
      '[]'::jsonb
    ) as payment_methods
  FROM customers c
  LEFT JOIN customer_payment_methods pm ON c.id = pm.customer_id
  WHERE c.id = p_customer_id
  GROUP BY c.id, c.stripe_customer_id;
END;
$$ LANGUAGE plpgsql;
-- Modify customers table to use email as primary key
ALTER TABLE customers
DROP CONSTRAINT customers_pkey,
ADD PRIMARY KEY (email);

-- Update foreign key references
ALTER TABLE customer_payment_methods
DROP CONSTRAINT customer_payment_methods_customer_id_fkey,
ADD CONSTRAINT customer_payment_methods_customer_email_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(email);

-- Update indexes
DROP INDEX IF EXISTS customers_stripe_customer_id_idx;
CREATE INDEX customers_stripe_customer_id_idx ON customers(stripe_customer_id);
CREATE INDEX customers_email_idx ON customers(email);
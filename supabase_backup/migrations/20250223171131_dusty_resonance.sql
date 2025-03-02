-- Create instructor_details table
CREATE TABLE IF NOT EXISTS instructor_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE REFERENCES auth_users(email) ON DELETE CASCADE,
  business_name text,
  address_street text,
  address_number text,
  address_postal_code text CHECK (address_postal_code IS NULL OR length(address_postal_code) = 5),
  address_city text,
  address_province text,
  address_country text,
  vat_number text CHECK (vat_number IS NULL OR length(vat_number) = 11),
  tax_code text CHECK (tax_code IS NULL OR length(tax_code) = 16),
  phone_number text,
  billing_details jsonb,
  privacy_accepted boolean DEFAULT false,
  terms_accepted boolean DEFAULT false,
  privacy_accepted_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE instructor_details ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view own instructor details"
  ON instructor_details FOR SELECT
  TO public
  USING (email = auth.email());

CREATE POLICY "Public can update own instructor details"
  ON instructor_details FOR UPDATE
  TO public
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

-- Create indexes
CREATE INDEX instructor_details_email_idx ON instructor_details(email);
CREATE INDEX instructor_details_vat_number_idx ON instructor_details(vat_number);
CREATE INDEX instructor_details_tax_code_idx ON instructor_details(tax_code);

-- Create function to register instructor with details
CREATE OR REPLACE FUNCTION register_instructor_with_details(
  p_email text,
  p_password_hash text,
  p_first_name text,
  p_last_name text,
  p_business_name text DEFAULT NULL,
  p_address_street text DEFAULT NULL,
  p_address_number text DEFAULT NULL,
  p_address_postal_code text DEFAULT NULL,
  p_address_city text DEFAULT NULL,
  p_address_province text DEFAULT NULL,
  p_address_country text DEFAULT NULL,
  p_vat_number text DEFAULT NULL,
  p_tax_code text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_privacy_accepted boolean DEFAULT false,
  p_terms_accepted boolean DEFAULT false
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Validate required fields
  IF NOT p_privacy_accepted OR NOT p_terms_accepted THEN
    RAISE EXCEPTION 'Privacy policy and terms must be accepted';
  END IF;

  -- Insert into auth_users
  INSERT INTO auth_users (
    email,
    password_hash,
    first_name,
    last_name,
    is_instructor,
    account_status
  ) VALUES (
    p_email,
    p_password_hash,
    p_first_name,
    p_last_name,
    true,
    'active'
  ) RETURNING id INTO v_user_id;

  -- Create instructor profile
  INSERT INTO instructor_profiles (
    email,
    first_name,
    last_name,
    subscription_status
  ) VALUES (
    p_email,
    p_first_name,
    p_last_name,
    'inactive'
  );

  -- Create instructor details
  INSERT INTO instructor_details (
    email,
    business_name,
    address_street,
    address_number,
    address_postal_code,
    address_city,
    address_province,
    address_country,
    vat_number,
    tax_code,
    phone_number,
    privacy_accepted,
    terms_accepted,
    privacy_accepted_at,
    terms_accepted_at
  ) VALUES (
    p_email,
    p_business_name,
    p_address_street,
    p_address_number,
    p_address_postal_code,
    p_address_city,
    p_address_province,
    p_address_country,
    p_vat_number,
    p_tax_code,
    p_phone_number,
    p_privacy_accepted,
    p_terms_accepted,
    CASE WHEN p_privacy_accepted THEN now() ELSE NULL END,
    CASE WHEN p_terms_accepted THEN now() ELSE NULL END
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION register_instructor_with_details(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, boolean, boolean
) TO public;

-- Create function to get instructor details
CREATE OR REPLACE FUNCTION get_instructor_details(p_email text)
RETURNS TABLE (
  email text,
  first_name text,
  last_name text,
  business_name text,
  address_street text,
  address_number text,
  address_postal_code text,
  address_city text,
  address_province text,
  address_country text,
  vat_number text,
  tax_code text,
  phone_number text,
  subscription_status text,
  privacy_accepted boolean,
  terms_accepted boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id.email,
    au.first_name,
    au.last_name,
    id.business_name,
    id.address_street,
    id.address_number,
    id.address_postal_code,
    id.address_city,
    id.address_province,
    id.address_country,
    id.vat_number,
    id.tax_code,
    id.phone_number,
    ip.subscription_status,
    id.privacy_accepted,
    id.terms_accepted
  FROM instructor_details id
  JOIN auth_users au ON au.email = id.email
  LEFT JOIN instructor_profiles ip ON ip.email = id.email
  WHERE id.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_instructor_details(text) TO public;
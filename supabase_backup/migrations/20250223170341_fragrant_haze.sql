-- Add new fields to instructor_profiles table
ALTER TABLE instructor_profiles
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS address_street text,
ADD COLUMN IF NOT EXISTS address_number text,
ADD COLUMN IF NOT EXISTS address_postal_code text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_province text,
ADD COLUMN IF NOT EXISTS address_country text,
ADD COLUMN IF NOT EXISTS vat_number text,
ADD COLUMN IF NOT EXISTS tax_code text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS billing_details jsonb,
ADD COLUMN IF NOT EXISTS privacy_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS instructor_profiles_business_name_idx ON instructor_profiles(business_name);
CREATE INDEX IF NOT EXISTS instructor_profiles_vat_number_idx ON instructor_profiles(vat_number);
CREATE INDEX IF NOT EXISTS instructor_profiles_tax_code_idx ON instructor_profiles(tax_code);

-- Add constraints
ALTER TABLE instructor_profiles
ADD CONSTRAINT instructor_profiles_vat_number_check 
  CHECK (vat_number IS NULL OR length(vat_number) = 11),
ADD CONSTRAINT instructor_profiles_tax_code_check 
  CHECK (tax_code IS NULL OR length(tax_code) = 16),
ADD CONSTRAINT instructor_profiles_postal_code_check 
  CHECK (address_postal_code IS NULL OR length(address_postal_code) = 5);

-- Create function to register instructor with full details
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
    subscription_status,
    privacy_accepted,
    terms_accepted,
    privacy_accepted_at,
    terms_accepted_at
  ) VALUES (
    p_email,
    p_first_name,
    p_last_name,
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
    'inactive',
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
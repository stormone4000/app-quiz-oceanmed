/*
  # Update Authentication System
  
  1. Changes
    - Add account_status to auth_users table
    - Add master_code field to instructor_profiles
    - Add function to verify instructor credentials
  
  2. Security
    - Update policies for instructor access
*/

-- Add account status to auth_users
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended'));

-- Add master code to instructor_profiles
ALTER TABLE instructor_profiles
ADD COLUMN IF NOT EXISTS master_code text;

-- Create function to verify instructor credentials
CREATE OR REPLACE FUNCTION verify_instructor_credentials(
  p_email text,
  p_password_hash text,
  p_master_code text DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  is_instructor boolean,
  account_status text,
  subscription_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.first_name,
    au.last_name,
    au.is_instructor,
    au.account_status,
    ip.subscription_status
  FROM auth_users au
  LEFT JOIN instructor_profiles ip ON au.email = ip.email
  WHERE au.email = p_email
  AND au.password_hash = p_password_hash
  AND au.is_instructor = true
  AND (
    p_master_code = '55555'  -- Master code override
    OR ip.subscription_status = 'active'  -- Active subscription
  );
END;
$$ LANGUAGE plpgsql;
/*
  # Add Instructor Authentication Support
  
  1. New Tables
    - `instructor_profiles`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `first_name` (text)
      - `last_name` (text)
      - `subscription_status` (text)
      - `created_at` (timestamptz)
      - `last_login` (timestamptz)
  
  2. Changes
    - Add instructor-specific fields to auth_users table
    - Add subscription tracking
  
  3. Security
    - Enable RLS
    - Add policies for instructor access
*/

-- Create instructor_profiles table
CREATE TABLE instructor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  subscription_status text NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled')),
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  billing_details jsonb,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Add instructor flag to auth_users
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS is_instructor boolean DEFAULT false;

-- Enable RLS
ALTER TABLE instructor_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view instructor profiles"
  ON instructor_profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Instructors can update own profile"
  ON instructor_profiles FOR UPDATE
  TO public
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

-- Create function to register instructor
CREATE OR REPLACE FUNCTION register_instructor(
  p_email text,
  p_password_hash text,
  p_first_name text,
  p_last_name text
) RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Insert into auth_users
  INSERT INTO auth_users (
    email,
    password_hash,
    first_name,
    last_name,
    is_instructor
  ) VALUES (
    p_email,
    p_password_hash,
    p_first_name,
    p_last_name,
    true
  ) RETURNING id INTO v_user_id;

  -- Create instructor profile
  INSERT INTO instructor_profiles (
    email,
    first_name,
    last_name
  ) VALUES (
    p_email,
    p_first_name,
    p_last_name
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;
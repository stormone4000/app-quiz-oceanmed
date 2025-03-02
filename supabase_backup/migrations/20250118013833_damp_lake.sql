/*
  # Access Code System Migration

  1. New Tables
    - access_codes: Stores all access codes (master and one-time)
    - access_code_usage: Tracks code usage history
  
  2. Security
    - Enable RLS on all tables
    - Create policies for public access
*/

-- Create access_codes table
CREATE TABLE access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('master', 'one_time')),
  created_by uuid REFERENCES auth.users(id),
  expiration_date timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create access_code_usage table
CREATE TABLE access_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid REFERENCES access_codes(id),
  student_email text NOT NULL,
  first_name text,
  last_name text,
  used_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_code_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view access codes"
  ON access_codes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view access code usage"
  ON access_code_usage FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can insert access code usage"
  ON access_code_usage FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes
CREATE INDEX access_codes_code_idx ON access_codes(code);
CREATE INDEX access_codes_type_idx ON access_codes(type);
CREATE INDEX access_codes_is_active_idx ON access_codes(is_active);
CREATE INDEX access_code_usage_code_id_idx ON access_code_usage(code_id);
CREATE INDEX access_code_usage_student_email_idx ON access_code_usage(student_email);

-- Insert master code
INSERT INTO access_codes (code, type, is_active)
VALUES ('55555', 'master', true);
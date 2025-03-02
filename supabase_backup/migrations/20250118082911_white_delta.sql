-- Create auth_users table for storing user credentials
CREATE TABLE auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  first_name text,
  last_name text,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Create password_reset_tokens table
CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth_users(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create login_attempts table for security
CREATE TABLE login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempt_time timestamptz DEFAULT now(),
  ip_address text,
  success boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can create auth users"
  ON auth_users FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can view own data"
  ON auth_users FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update own data"
  ON auth_users FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX auth_users_email_idx ON auth_users(email);
CREATE INDEX password_reset_tokens_token_idx ON password_reset_tokens(token);
CREATE INDEX login_attempts_email_idx ON login_attempts(email);
CREATE INDEX login_attempts_time_idx ON login_attempts(attempt_time);
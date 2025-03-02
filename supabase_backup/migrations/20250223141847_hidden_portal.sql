/*
  # Set Master Admin Credentials

  This migration will:
  1. Update the master admin user with the specified credentials
  2. Ensure proper access rights
*/

-- Begin transaction
BEGIN;

-- Update master admin credentials
UPDATE auth_users
SET 
  password_hash = encode(digest('Rainyr0l3ktpmts380_', 'sha256'), 'hex'),
  first_name = 'Marcos',
  last_name = 'Bruno',
  is_master = true,
  is_instructor = false,
  account_status = 'active'
WHERE email = 'marcosrenatobruno@gmail.com';

-- If master admin doesn't exist, create it
INSERT INTO auth_users (
  email,
  password_hash,
  first_name,
  last_name,
  is_master,
  is_instructor,
  account_status
)
SELECT 
  'marcosrenatobruno@gmail.com',
  encode(digest('Rainyr0l3ktpmts380_', 'sha256'), 'hex'),
  'Marcos',
  'Bruno',
  true,
  false,
  'active'
WHERE NOT EXISTS (
  SELECT 1 FROM auth_users 
  WHERE email = 'marcosrenatobruno@gmail.com'
);

-- Ensure master code exists
INSERT INTO access_codes (
  code,
  type,
  is_active,
  duration_type
)
VALUES (
  '55555',
  'master',
  true,
  'unlimited'
)
ON CONFLICT (code) DO UPDATE
SET 
  is_active = true,
  duration_type = 'unlimited';

COMMIT;
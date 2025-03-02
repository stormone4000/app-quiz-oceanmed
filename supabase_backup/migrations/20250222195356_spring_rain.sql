-- Hash the password 'Rainyr0l3ktpmts380_' using SHA-256
WITH password_hash AS (
  SELECT encode(digest('Rainyr0l3ktpmts380_', 'sha256'), 'hex') as hash
)
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
  hash,
  'Marcos',
  'Bruno',
  true,
  false,
  'active'
FROM password_hash
ON CONFLICT (email) DO UPDATE
SET 
  password_hash = EXCLUDED.password_hash,
  is_master = true,
  is_instructor = false,
  account_status = 'active';

-- Ensure master code exists in access_codes
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
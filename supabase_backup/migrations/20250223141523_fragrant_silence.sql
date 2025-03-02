/*
  # Clean Database Data

  This migration will:
  1. Remove all student and instructor data
  2. Reset access codes
  3. Preserve quiz templates and questions
  4. Clean up related tables
  5. Ensure master admin exists
*/

-- Begin transaction
BEGIN;

-- 1. Clean up student-related data
TRUNCATE TABLE results CASCADE;
TRUNCATE TABLE quiz_assignment_attempts CASCADE;
TRUNCATE TABLE quiz_progress CASCADE;
TRUNCATE TABLE student_quiz_assignments CASCADE;
TRUNCATE TABLE notification_read_status CASCADE;
TRUNCATE TABLE instructor_comments CASCADE;

-- 2. Clean up instructor-related data
TRUNCATE TABLE instructor_profiles CASCADE;
TRUNCATE TABLE subscriptions CASCADE;
TRUNCATE TABLE subscription_changes CASCADE;
TRUNCATE TABLE subscription_events CASCADE;
TRUNCATE TABLE subscription_notifications CASCADE;
TRUNCATE TABLE subscription_actions CASCADE;

-- 3. Clean up access codes
DELETE FROM access_code_usage;
DELETE FROM access_codes WHERE code != '55555';

-- 4. Clean up auth data (except master admin)
DELETE FROM auth_users 
WHERE email != 'marcosrenatobruno@gmail.com';

-- 5. Clean up live quiz data
TRUNCATE TABLE live_quiz_participants CASCADE;
TRUNCATE TABLE live_quiz_results CASCADE;
DELETE FROM live_quiz_sessions WHERE status != 'completed';

-- 6. Reset sequences
SELECT setval(pg_get_serial_sequence('results', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('quiz_assignment_attempts', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('student_quiz_assignments', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('instructor_profiles', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('subscriptions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('subscription_changes', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('access_code_usage', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('live_quiz_participants', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('live_quiz_results', 'id'), 1, false);

-- 7. Ensure master code exists
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

-- 8. Update master admin (instead of inserting)
UPDATE auth_users
SET 
  is_master = true,
  is_instructor = false,
  account_status = 'active'
WHERE email = 'marcosrenatobruno@gmail.com';

COMMIT;
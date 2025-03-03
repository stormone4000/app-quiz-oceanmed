SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'results' ORDER BY ordinal_position;
SELECT * FROM results LIMIT 5;
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'auth_users' ORDER BY ordinal_position;
SELECT * FROM auth_users LIMIT 5;
-- Sostituisci 'email_utente@esempio.com' con l'email dell'utente che stai testando
SELECT * FROM results WHERE student_email = 'email_utente@esempio.com';
SELECT column_name FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'is_instructor_attempt';

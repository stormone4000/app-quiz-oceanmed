-- Verifica se l'RLS è attivo sulla tabella auth_users
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'auth_users';
-- Disattiva temporaneamente l'RLS sulla tabella auth_users
ALTER TABLE auth_users DISABLE ROW LEVEL SECURITY;
-- NOTA: Per riattivare l'RLS in futuro, esegui:
-- ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;

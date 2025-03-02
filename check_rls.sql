-- Query corretta per verificare se RLS è abilitato sulla tabella results
SELECT relname AS table_name, 
       relrowsecurity AS row_level_security_enabled
FROM pg_class
WHERE relname = 'results';

-- Se relrowsecurity è "t" (true), allora RLS è abilitato
-- Se relrowsecurity è "f" (false), allora RLS è disabilitato

-- Comando per abilitare RLS sulla tabella results
-- ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Comando per verificare le politiche RLS esistenti sulla tabella results
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'results';
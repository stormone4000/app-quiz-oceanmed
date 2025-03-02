-- Verifichiamo la struttura della tabella results

-- Verificare la struttura della tabella results
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'results'
ORDER BY ordinal_position;

-- Verificare le policy RLS sulla tabella results
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE tablename = 'results';

-- Verificare se la RLS è abilitata sulla tabella results
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'results' 
AND relkind = 'r';

-- Verificare i vincoli sulla tabella results
SELECT con.conname, con.contype, 
  pg_get_constraintdef(con.oid) AS constraintdef
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = con.connamespace
WHERE rel.relname = 'results'
AND nsp.nspname = 'public';

-- Verificare che la colonna quiz_id esista e sia del tipo corretto
SELECT pg_typeof(quiz_id) 
FROM results 
LIMIT 1;

-- Verifica il tipo della colonna id nella tabella quizzes
SELECT 
  a.attname, 
  pg_catalog.format_type(a.atttypid, a.atttypmod)
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'quizzes'
AND a.attname = 'id'
AND a.attnum > 0 
AND NOT a.attisdropped;

-- Verificare la struttura della tabella quizzes (tabella a cui si fa riferimento)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'quizzes'
ORDER BY ordinal_position;

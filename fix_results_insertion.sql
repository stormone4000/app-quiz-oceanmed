-- 1. Controlliamo se la tabella results ha trigger che potrebbero interferire
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement, 
  action_condition
FROM information_schema.triggers
WHERE event_object_table = 'results'
AND event_object_schema = 'public';

-- 2. Verifichiamo lo schema effettivo della tabella results
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'results'
ORDER BY ordinal_position;

-- 3. Verifichiamo se la tabella quizzes ha l'id corretto
SELECT id, title, quiz_type 
FROM quizzes 
LIMIT 5;

-- 4. Verifichiamo se ci sono vincoli di foreign key
SELECT 
  tc.constraint_name,
  tc.table_name AS referencing_table,
  kcu.column_name AS referencing_column,
  ccu.table_name AS referenced_table, 
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'results';

-- 5. Verifichiamo se c'è bisogno di aggiungere un typecast esplicito
SELECT 
  a.attname, 
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'results'
AND a.attname = 'quiz_id'
AND a.attnum > 0 
AND NOT a.attisdropped;

-- 6. Se il problema è con il tipo di quiz_id, possiamo creare una funzione per la conversione sicura
CREATE OR REPLACE FUNCTION try_cast_uuid(p_in text)
RETURNS uuid AS $$
BEGIN
  RETURN p_in::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Errore di conversione UUID: %', p_in;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Verifichiamo le politiche RLS
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

-- 8. Se necessario, correggiamo le policy RLS
/*
DROP POLICY IF EXISTS "Students can insert their own results" ON public.results;
CREATE POLICY "Students can insert their own results" 
ON public.results 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Students can read only their own results" ON public.results;
CREATE POLICY "Students can read only their own results" 
ON public.results 
FOR SELECT 
TO authenticated 
USING (student_email = auth.email());

DROP POLICY IF EXISTS "Instructors can read results of their own quizzes" ON public.results;
CREATE POLICY "Instructors can read results of their own quizzes" 
ON public.results 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM quizzes q 
    WHERE q.id = quiz_id 
    AND q.created_by = auth.email()
  )
);
*/ 
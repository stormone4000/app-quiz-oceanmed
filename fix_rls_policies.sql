-- SQL per correggere le politiche RLS per la tabella results

-- 1. Verifica la struttura della tabella results
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'results';

-- 2. Verifica la struttura della tabella quizzes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quizzes';

-- 3. Verifica le politiche RLS esistenti per la tabella results
SELECT * FROM pg_policies WHERE tablename = 'results';

-- 4. Crea o aggiorna la politica RLS per consentire agli studenti di inserire i propri risultati
CREATE POLICY insert_own_results ON results 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IN (
  SELECT id FROM auth.users WHERE email = student_email
));

-- 5. Crea o aggiorna la politica RLS per consentire agli studenti di leggere i propri risultati
CREATE POLICY read_own_results ON results 
FOR SELECT 
TO authenticated 
USING (auth.uid() IN (
  SELECT id FROM auth.users WHERE email = student_email
));

-- 6. Crea o aggiorna la politica RLS per consentire agli istruttori di leggere i risultati dei propri quiz
CREATE POLICY read_instructor_results ON results 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM quizzes q
    WHERE q.id = quiz_id
    AND q.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_app_meta_data->>'is_master' = 'true'
  )
);

-- 7. Abilita RLS sulla tabella results se non è già abilitata
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- 8. Verifica che non ci siano vincoli di foreign key che impediscono l'inserimento
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM
  information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'results';

-- 9. Verifica i tipi di dati delle colonne quiz_id in results e id in quizzes
SELECT 
  c1.table_name, c1.column_name, c1.data_type AS results_type,
  c2.table_name, c2.column_name, c2.data_type AS quizzes_type
FROM 
  information_schema.columns c1,
  information_schema.columns c2
WHERE 
  c1.table_name = 'results' AND c1.column_name = 'quiz_id' AND
  c2.table_name = 'quizzes' AND c2.column_name = 'id'; 
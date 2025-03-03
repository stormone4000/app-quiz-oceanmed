-- SQL alternativo per correggere le politiche RLS per la tabella results

-- 1. Elimina le politiche RLS esistenti per la tabella results
DROP POLICY IF EXISTS insert_own_results ON results;
DROP POLICY IF EXISTS read_own_results ON results;
DROP POLICY IF EXISTS read_instructor_results ON results;

-- 2. Crea una politica RLS più permissiva per consentire a tutti gli utenti autenticati di inserire risultati
CREATE POLICY insert_results_permissive ON results 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Crea una politica RLS per consentire agli studenti di leggere i propri risultati
CREATE POLICY read_own_results_permissive ON results 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Abilita RLS sulla tabella results
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- 5. Verifica se ci sono vincoli di foreign key che potrebbero causare problemi
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

-- 6. Se necessario, elimina temporaneamente i vincoli di foreign key
-- ALTER TABLE results DROP CONSTRAINT IF EXISTS results_quiz_id_fkey;

-- 7. Verifica i tipi di dati e, se necessario, modifica il tipo di dati della colonna quiz_id
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'results' AND column_name = 'quiz_id';
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'id';

-- 8. Se i tipi di dati non corrispondono, modifica il tipo di dati della colonna quiz_id
-- ALTER TABLE results ALTER COLUMN quiz_id TYPE uuid USING quiz_id::uuid;

-- 9. Concedi i permessi necessari sulla tabella results
GRANT ALL ON results TO authenticated;
GRANT ALL ON results TO anon;

-- 10. Disabilita temporaneamente RLS per debug
-- ALTER TABLE results DISABLE ROW LEVEL SECURITY; 
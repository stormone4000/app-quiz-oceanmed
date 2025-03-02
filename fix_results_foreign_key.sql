-- 1. Verificare quali tabelle esistono realmente nel database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('quizzes', 'quiz_templates', 'results');

-- 2. Verificare la struttura della tabella results per capire il nome della colonna di chiave esterna
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'results';

-- 3. Verificare quali chiavi esterne esistono già sulla tabella results
SELECT
    tc.constraint_name,
    tc.table_name AS referencing_table,
    kcu.column_name AS referencing_column,
    ccu.table_name AS referenced_table,
    ccu.column_name AS referenced_column
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'results';

-- 4. Se la tabella quizzes esiste, verifica la sua struttura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'quizzes';

-- 5. Se necessario, aggiungere una relazione tra results e quiz_templates
-- NOTA: Eseguire solo dopo aver verificato i nomi corretti delle tabelle e delle colonne

/*
ALTER TABLE public.results
ADD CONSTRAINT results_quiz_id_fkey
FOREIGN KEY (quiz_id)
REFERENCES public.quiz_templates(id);
*/ 
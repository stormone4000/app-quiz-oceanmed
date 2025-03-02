-- Script per aggiungere la relazione di chiave esterna tra access_codes e access_code_usage

-- Verifica se esiste già un vincolo di chiave esterna
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'access_code_usage'
        AND constraint_name LIKE '%code_id%'
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
        -- Aggiungi il vincolo di chiave esterna
        EXECUTE 'ALTER TABLE public.access_code_usage 
                ADD CONSTRAINT access_code_usage_code_id_fkey 
                FOREIGN KEY (code_id) 
                REFERENCES public.access_codes(id) 
                ON DELETE CASCADE';
                
        RAISE NOTICE 'Vincolo di chiave esterna aggiunto con successo.';
    ELSE
        RAISE NOTICE 'Il vincolo di chiave esterna esiste già.';
    END IF;
END $$;

-- Verifica che la relazione sia stata creata correttamente
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='access_code_usage' 
    AND kcu.column_name='code_id';

-- Aggiorna la cache dello schema di PostgREST
SELECT pg_notify('pgrst', 'reload schema');

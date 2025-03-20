# Istruzioni per Aggiungere Politiche RLS

Per risolvere il problema di visibilità delle categorie e dei video per l'istruttore, è necessario aggiungere alcune politiche RLS (Row Level Security) al database Supabase.

## Cosa sono le Politiche RLS?

Le politiche RLS (Row Level Security) sono regole che determinano quali righe di una tabella un utente può vedere o modificare. Nel nostro caso, vogliamo assicurarci che un istruttore possa vedere solo le proprie categorie e i propri video.

## Come Aggiungere le Politiche RLS

1. Accedi al pannello di amministrazione di Supabase.
2. Vai alla sezione "SQL Editor".
3. Copia e incolla il seguente codice SQL:

```sql
-- Verifica se la politica esiste già
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'video_categories'
        AND policyname = 'Instructors can view their own categories'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        -- Crea la politica se non esiste
        EXECUTE 'CREATE POLICY "Instructors can view their own categories" ON video_categories FOR SELECT TO authenticated USING (creator_id = auth.uid())';
        RAISE NOTICE 'Politica "Instructors can view their own categories" creata con successo.';
    ELSE
        RAISE NOTICE 'La politica "Instructors can view their own categories" esiste già.';
    END IF;
END $$;

-- Verifica se la politica per l'inserimento esiste già
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'video_categories'
        AND policyname = 'Instructors can insert their own categories'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        -- Crea la politica se non esiste
        EXECUTE 'CREATE POLICY "Instructors can insert their own categories" ON video_categories FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid())';
        RAISE NOTICE 'Politica "Instructors can insert their own categories" creata con successo.';
    ELSE
        RAISE NOTICE 'La politica "Instructors can insert their own categories" esiste già.';
    END IF;
END $$;

-- Verifica se la politica per l'aggiornamento esiste già
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'video_categories'
        AND policyname = 'Instructors can update their own categories'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        -- Crea la politica se non esiste
        EXECUTE 'CREATE POLICY "Instructors can update their own categories" ON video_categories FOR UPDATE TO authenticated USING (creator_id = auth.uid())';
        RAISE NOTICE 'Politica "Instructors can update their own categories" creata con successo.';
    ELSE
        RAISE NOTICE 'La politica "Instructors can update their own categories" esiste già.';
    END IF;
END $$;

-- Verifica se la politica per l'eliminazione esiste già
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'video_categories'
        AND policyname = 'Instructors can delete their own categories'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        -- Crea la politica se non esiste
        EXECUTE 'CREATE POLICY "Instructors can delete their own categories" ON video_categories FOR DELETE TO authenticated USING (creator_id = auth.uid())';
        RAISE NOTICE 'Politica "Instructors can delete their own categories" creata con successo.';
    ELSE
        RAISE NOTICE 'La politica "Instructors can delete their own categories" esiste già.';
    END IF;
END $$;

-- Verifica se la politica per la visualizzazione dei video esiste già
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'videos'
        AND policyname = 'Instructors can view their own videos'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        -- Crea la politica se non esiste
        EXECUTE 'CREATE POLICY "Instructors can view their own videos" ON videos FOR SELECT TO authenticated USING (creator_id = auth.uid())';
        RAISE NOTICE 'Politica "Instructors can view their own videos" creata con successo.';
    ELSE
        RAISE NOTICE 'La politica "Instructors can view their own videos" esiste già.';
    END IF;
END $$;

-- Verifica se la politica per l'inserimento dei video esiste già
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'videos'
        AND policyname = 'Instructors can insert their own videos'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        -- Crea la politica se non esiste
        EXECUTE 'CREATE POLICY "Instructors can insert their own videos" ON videos FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid())';
        RAISE NOTICE 'Politica "Instructors can insert their own videos" creata con successo.';
    ELSE
        RAISE NOTICE 'La politica "Instructors can insert their own videos" esiste già.';
    END IF;
END $$;

-- Verifica se la politica per l'aggiornamento dei video esiste già
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'videos'
        AND policyname = 'Instructors can update their own videos'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        -- Crea la politica se non esiste
        EXECUTE 'CREATE POLICY "Instructors can update their own videos" ON videos FOR UPDATE TO authenticated USING (creator_id = auth.uid())';
        RAISE NOTICE 'Politica "Instructors can update their own videos" creata con successo.';
    ELSE
        RAISE NOTICE 'La politica "Instructors can update their own videos" esiste già.';
    END IF;
END $$;

-- Verifica se la politica per l'eliminazione dei video esiste già
DO $$
DECLARE
    policy_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'videos'
        AND policyname = 'Instructors can delete their own videos'
    ) INTO policy_exists;

    IF NOT policy_exists THEN
        -- Crea la politica se non esiste
        EXECUTE 'CREATE POLICY "Instructors can delete their own videos" ON videos FOR DELETE TO authenticated USING (creator_id = auth.uid())';
        RAISE NOTICE 'Politica "Instructors can delete their own videos" creata con successo.';
    ELSE
        RAISE NOTICE 'La politica "Instructors can delete their own videos" esiste già.';
    END IF;
END $$;
```

4. Esegui la query cliccando sul pulsante "Run".
5. Verifica che le politiche siano state create correttamente.

## Verifica delle Politiche RLS

Per verificare che le politiche RLS siano state create correttamente, puoi eseguire la seguente query SQL:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename IN ('video_categories', 'videos');
```

Dovresti vedere le politiche che hai appena creato nell'elenco dei risultati.

## Dopo l'Aggiunta delle Politiche RLS

Dopo aver aggiunto le politiche RLS, riavvia l'applicazione e accedi con l'account dell'istruttore. Dovresti vedere le categorie e i video dell'istruttore nell'interfaccia.

Se continui a non vedere le categorie e i video, controlla i log della console del browser per eventuali errori. 
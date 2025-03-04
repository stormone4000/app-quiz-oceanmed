-- Aggiunta del codice 392673 come codice master attivo
INSERT INTO "public"."access_codes" ("id", "code", "type", "created_by", "expiration_date", "is_active", "created_at", "duration_months", "duration_type")
VALUES (gen_random_uuid(), '392673', 'master', 'system', NULL, true, now(), NULL, 'unlimited');
\n-- Ottieni l'ID del codice appena inserito per utilizzarlo nella tabella usage
DO $$
DECLARE
    new_code_id UUID;
BEGIN
    -- Ottieni l'ID del codice appena inserito
    SELECT id INTO new_code_id FROM "public"."access_codes" WHERE "code" = '392673';
    
    -- Inserisci un record di utilizzo per istruttore1@io.it
    INSERT INTO "public"."access_code_usage" ("id", "access_code_id", "user_email", "user_name", "used_at")
    VALUES (gen_random_uuid(), new_code_id, 'istruttore1@io.it', 'Istruttore Test', now());
END
$$;
\n-- Verifica l'inserimento nella tabella access_codes
SELECT * FROM "public"."access_codes" WHERE "code" = '392673';
\n-- Verifica l'inserimento nella tabella access_code_usage

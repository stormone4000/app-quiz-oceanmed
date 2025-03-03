-- Aggiungi la colonna student_email alla tabella notification_read_status se non esiste già
ALTER TABLE notification_read_status ADD COLUMN IF NOT EXISTS student_email TEXT NOT NULL DEFAULT '';
-- Aggiorna la chiave primaria per includere student_email
ALTER TABLE notification_read_status DROP CONSTRAINT IF EXISTS notification_read_status_pkey;
ALTER TABLE notification_read_status ADD PRIMARY KEY (notification_id, student_email);

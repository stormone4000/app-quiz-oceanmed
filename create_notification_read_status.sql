-- Questa query crea la tabella notification_read_status se non esiste già
-- La tabella tiene traccia dello stato di lettura delle notifiche per ogni studente
-- Colonne:
-- - notification_id: ID della notifica (UUID)
-- - student_email: Email dello studente
-- - read_at: Data e ora di lettura della notifica
-- La chiave primaria è composta da notification_id e student_email

CREATE TABLE IF NOT EXISTS notification_read_status (
  notification_id UUID NOT NULL, 
  student_email TEXT NOT NULL, 
  read_at TIMESTAMP WITH TIME ZONE, 
  PRIMARY KEY (notification_id, student_email)
);

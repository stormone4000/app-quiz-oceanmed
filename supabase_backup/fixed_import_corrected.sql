-- Script per creare le tabelle e importare i dati dal database remoto al database locale

-- Disabilita temporaneamente i vincoli di chiave esterna
SET session_replication_role = 'replica';

-- Elimina le tabelle se esistono
DROP TABLE IF EXISTS "public"."quiz_questions";
DROP TABLE IF EXISTS "public"."quiz_templates";
DROP TABLE IF EXISTS "public"."questions";
DROP TABLE IF EXISTS "public"."quiz_types";
DROP TABLE IF EXISTS "public"."subscriptions";

-- Crea la tabella quiz_types
CREATE TABLE IF NOT EXISTS "public"."quiz_types" (
    "id" uuid PRIMARY KEY,
    "name" text NOT NULL,
    "description" text,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Crea la tabella questions
CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" uuid PRIMARY KEY,
    "text" text NOT NULL,
    "options" jsonb NOT NULL,
    "correct_answer" text NOT NULL,
    "explanation" text,
    "image_url" text,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Crea la tabella quiz_templates
CREATE TABLE IF NOT EXISTS "public"."quiz_templates" (
    "id" uuid PRIMARY KEY,
    "title" text NOT NULL,
    "description" text,
    "quiz_type_id" uuid REFERENCES "public"."quiz_types"("id"),
    "difficulty" text,
    "time_limit" integer,
    "passing_score" integer,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Crea la tabella quiz_questions
CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" uuid PRIMARY KEY,
    "quiz_id" uuid REFERENCES "public"."quiz_templates"("id"),
    "question_id" uuid REFERENCES "public"."questions"("id"),
    "created_at" timestamp with time zone DEFAULT now()
);

-- Crea la tabella subscriptions
CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" uuid PRIMARY KEY,
    "user_id" uuid NOT NULL,
    "plan_id" text NOT NULL,
    "status" text NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Inserisci i dati nella tabella quiz_types
INSERT INTO "public"."quiz_types" ("id", "name", "description", "created_at") VALUES
('ec6aff76-cdc9-4ae5-abdc-110cb3c59bb7', 'Patente Nautica', 'Quiz per la preparazione all''esame della patente nautica', '2023-10-12T14:30:00Z'),
('f8c4a3d2-b7e1-5f9a-8c6d-2e3b4a5c6d7e', 'Corso Base', 'Quiz per il corso base di navigazione', '2023-10-15T10:15:00Z');

-- Inserisci i dati nella tabella quiz_templates
INSERT INTO "public"."quiz_templates" ("id", "title", "description", "quiz_type_id", "difficulty", "time_limit", "passing_score", "created_at") VALUES
('3fed7241-a873-4973-a107-747e8e3e6ef6', 'Quiz Patente Nautica - Base', 'Quiz di preparazione per l''esame della patente nautica - livello base', 'ec6aff76-cdc9-4ae5-abdc-110cb3c59bb7', 'Facile', 30, 70, '2023-10-20T09:00:00Z'),
('cca48478-fa9d-425c-8b64-c6c6330e11f7', 'Quiz Patente Nautica - Intermedio', 'Quiz di preparazione per l''esame della patente nautica - livello intermedio', 'ec6aff76-cdc9-4ae5-abdc-110cb3c59bb7', 'Medio', 25, 75, '2023-10-21T10:30:00Z'),
('d0bfa54e-3dbe-49f9-a25c-7c1d029ecc22', 'Quiz Patente Nautica - Avanzato', 'Quiz di preparazione per l''esame della patente nautica - livello avanzato', 'ec6aff76-cdc9-4ae5-abdc-110cb3c59bb7', 'Difficile', 20, 80, '2023-10-22T11:45:00Z'),
('dcd23523-680e-4190-b2f7-f9d6111dc077', 'Quiz Corso Base - Introduzione', 'Quiz introduttivo al corso base di navigazione', 'f8c4a3d2-b7e1-5f9a-8c6d-2e3b4a5c6d7e', 'Facile', 15, 60, '2023-10-23T14:00:00Z'),
('f8286742-7cfb-4b4b-b8a3-a72d6c26b859', 'Quiz Corso Base - Fondamenti', 'Quiz sui fondamenti del corso base di navigazione', 'f8c4a3d2-b7e1-5f9a-8c6d-2e3b4a5c6d7e', 'Medio', 20, 65, '2023-10-24T15:30:00Z'),
('96fa1af7-eadc-422d-b98a-50d2bce8a997', 'Quiz Corso Base - Pratica', 'Quiz sulla parte pratica del corso base di navigazione', 'f8c4a3d2-b7e1-5f9a-8c6d-2e3b4a5c6d7e', 'Difficile', 25, 70, '2023-10-25T16:45:00Z'),
('115705ec-74a1-4d4b-9b01-1672d36e1f8a', 'Quiz Patente Nautica - Simulazione Esame', 'Simulazione dell''esame per la patente nautica', 'ec6aff76-cdc9-4ae5-abdc-110cb3c59bb7', 'Difficile', 60, 85, '2023-10-26T09:00:00Z'),
('41a243d1-9e13-4687-9b42-84a310eb1e92', 'Quiz Corso Base - Simulazione Finale', 'Simulazione finale del corso base di navigazione', 'f8c4a3d2-b7e1-5f9a-8c6d-2e3b4a5c6d7e', 'Difficile', 45, 75, '2023-10-27T10:30:00Z'),
('18228cd1-a6d3-4fb9-805f-f61f7e563c91', 'Quiz Patente Nautica - Ripasso', 'Quiz di ripasso per l''esame della patente nautica', 'ec6aff76-cdc9-4ae5-abdc-110cb3c59bb7', 'Medio', 40, 70, '2023-10-28T11:45:00Z'),
('b9e7a3c1-5d2f-4e8b-9a6c-7d8e9f0b1c2d', 'Quiz Corso Base - Ripasso', 'Quiz di ripasso per il corso base di navigazione', 'f8c4a3d2-b7e1-5f9a-8c6d-2e3b4a5c6d7e', 'Medio', 35, 65, '2023-10-29T14:00:00Z'),
('c8d7e6f5-4b3a-2c1d-0e9f-8a7b6c5d4e3f', 'Quiz Patente Nautica - Test Rapido', 'Test rapido per la patente nautica', 'ec6aff76-cdc9-4ae5-abdc-110cb3c59bb7', 'Facile', 10, 60, '2023-10-30T15:30:00Z'),
('d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a', 'Quiz Corso Base - Test Rapido', 'Test rapido per il corso base di navigazione', 'f8c4a3d2-b7e1-5f9a-8c6d-2e3b4a5c6d7e', 'Facile', 10, 55, '2023-10-31T16:45:00Z');

-- Inserisci alcuni dati di esempio nella tabella questions
INSERT INTO "public"."questions" ("id", "text", "options", "correct_answer", "explanation", "image_url", "created_at") VALUES
('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Quale è la parte anteriore di una barca?', '["Prua", "Poppa", "Chiglia", "Timone"]', 'Prua', 'La prua è la parte anteriore di una barca, mentre la poppa è la parte posteriore.', NULL, '2023-11-01T09:00:00Z');

INSERT INTO "public"."questions" ("id", "text", "options", "correct_answer", "explanation", "image_url", "created_at") VALUES
('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Cosa indica il termine "sottovento"?', '["La direzione da cui proviene il vento", "La direzione verso cui va il vento", "La zona protetta dal vento", "La velocità del vento"]', 'La direzione verso cui va il vento', 'Sottovento indica la direzione verso cui va il vento, mentre sopravvento indica la direzione da cui proviene.', NULL, '2023-11-02T10:30:00Z');

INSERT INTO "public"."questions" ("id", "text", "options", "correct_answer", "explanation", "image_url", "created_at") VALUES
('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'Quale strumento misura la velocità del vento?', '["Anemometro", "Barometro", "Idrometro", "Termometro"]', 'Anemometro', 'L''anemometro è lo strumento utilizzato per misurare la velocità del vento.', NULL, '2023-11-03T11:45:00Z');

INSERT INTO "public"."questions" ("id", "text", "options", "correct_answer", "explanation", "image_url", "created_at") VALUES
('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Cosa si intende per "andatura di bolina"?', '["Navigare con il vento in poppa", "Navigare con il vento al traverso", "Navigare con il vento in prua", "Navigare con il vento a 45° rispetto alla prua"]', 'Navigare con il vento a 45° rispetto alla prua', 'L''andatura di bolina consiste nel navigare con un angolo di circa 45° rispetto alla direzione del vento.', NULL, '2023-11-04T14:00:00Z');

INSERT INTO "public"."questions" ("id", "text", "options", "correct_answer", "explanation", "image_url", "created_at") VALUES
('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'Quale è la funzione principale dell''ancora?', '["Aumentare la velocità della barca", "Mantenere la barca in una posizione fissa", "Dirigere la barca", "Misurare la profondità dell''acqua"]', 'Mantenere la barca in una posizione fissa', 'L''ancora serve a mantenere la barca ferma in un punto, impedendole di muoversi con le correnti o il vento.', NULL, '2023-11-05T15:30:00Z');

INSERT INTO "public"."questions" ("id", "text", "options", "correct_answer", "explanation", "image_url", "created_at") VALUES
('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'Cosa indica il termine "nodo" nella navigazione?', '["Un tipo di legatura delle corde", "Un''unità di misura della velocità", "Un punto di giunzione dello scafo", "Un tipo di vela"]', 'Un''unità di misura della velocità', 'Il nodo è un''unità di misura della velocità utilizzata nella navigazione, equivalente a un miglio nautico all''ora (1,852 km/h).', NULL, '2023-11-06T16:45:00Z');

-- Inserisci alcuni dati di esempio nella tabella quiz_questions
INSERT INTO "public"."quiz_questions" ("id", "quiz_id", "question_id", "created_at") VALUES
('11111111-1111-1111-1111-111111111111', '3fed7241-a873-4973-a107-747e8e3e6ef6', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '2023-11-10T09:00:00Z'),
('22222222-2222-2222-2222-222222222222', '3fed7241-a873-4973-a107-747e8e3e6ef6', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '2023-11-10T09:01:00Z'),
('33333333-3333-3333-3333-333333333333', 'cca48478-fa9d-425c-8b64-c6c6330e11f7', 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', '2023-11-10T09:02:00Z'),
('44444444-4444-4444-4444-444444444444', 'cca48478-fa9d-425c-8b64-c6c6330e11f7', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', '2023-11-10T09:03:00Z'),
('55555555-5555-5555-5555-555555555555', 'd0bfa54e-3dbe-49f9-a25c-7c1d029ecc22', 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', '2023-11-10T09:04:00Z'),
('66666666-6666-6666-6666-666666666666', 'd0bfa54e-3dbe-49f9-a25c-7c1d029ecc22', 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', '2023-11-10T09:05:00Z');

-- Inserisci alcuni dati di esempio nella tabella subscriptions
INSERT INTO "public"."subscriptions" ("id", "user_id", "plan_id", "status", "start_date", "end_date", "created_at") VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'piano_base', 'active', '2023-11-01T00:00:00Z', '2023-12-01T00:00:00Z', '2023-11-01T00:00:00Z'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'piano_premium', 'active', '2023-11-05T00:00:00Z', '2024-11-05T00:00:00Z', '2023-11-05T00:00:00Z');

-- Riabilita i vincoli di chiave esterna
SET session_replication_role = 'origin'; 
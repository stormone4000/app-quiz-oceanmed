-- Script per creare le tabelle e importare i dati dal database remoto al database locale

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
    "question_text" text NOT NULL,
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
    "category" text,
    "difficulty" text,
    "time_limit" integer,
    "passing_score" integer,
    "created_at" timestamp with time zone DEFAULT now(),
    "quiz_type_id" uuid REFERENCES "public"."quiz_types"("id")
);

-- Crea la tabella quiz_questions
CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" uuid PRIMARY KEY,
    "quiz_id" uuid REFERENCES "public"."quiz_templates"("id"),
    "question_text" text NOT NULL,
    "options" jsonb NOT NULL,
    "correct_answer" text NOT NULL,
    "explanation" text,
    "image_url" text,
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

-- Inserisci i dati nella tabella questions
-- Nota: questi dati sono stati recuperati dal backup e potrebbero richiedere adattamenti
-- Inserisci qui i dati dalla tabella questions.json

-- Inserisci i dati nella tabella quiz_templates
-- Nota: questi dati sono stati recuperati dal backup e potrebbero richiedere adattamenti
-- Inserisci qui i dati dalla tabella quiz_templates.json

-- Inserisci i dati nella tabella quiz_questions
-- Nota: questi dati sono stati recuperati dal backup e potrebbero richiedere adattamenti
-- Inserisci qui i dati dalla tabella quiz_questions.json

-- Inserisci i dati nella tabella subscriptions
-- Nota: questi dati sono stati recuperati dal backup e potrebbero richiedere adattamenti
-- Inserisci qui i dati dalla tabella subscriptions.json 
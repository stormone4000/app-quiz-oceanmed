-- Script per creare le tabelle con la stessa struttura del database remoto

-- Disabilita temporaneamente i vincoli di chiave esterna
SET session_replication_role = 'replica';

-- Elimina le tabelle se esistono
DROP TABLE IF EXISTS "public"."quiz_questions";
DROP TABLE IF EXISTS "public"."quiz_templates";
DROP TABLE IF EXISTS "public"."questions";
DROP TABLE IF EXISTS "public"."quiz_types";
DROP TABLE IF EXISTS "public"."subscriptions";
DROP TABLE IF EXISTS "public"."quizzes";

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
    "quiz_id" uuid,
    "text" text NOT NULL,
    "options" jsonb NOT NULL,
    "correct_answer" integer NOT NULL,
    "time_limit" integer,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Crea la tabella quizzes (anche se attualmente vuota nel database remoto)
CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" uuid PRIMARY KEY,
    "title" text NOT NULL,
    "description" text,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Crea la tabella quiz_templates
CREATE TABLE IF NOT EXISTS "public"."quiz_templates" (
    "id" uuid PRIMARY KEY,
    "title" text NOT NULL,
    "description" text,
    "quiz_type" text,
    "category" text,
    "question_count" integer,
    "duration_minutes" integer,
    "icon" text,
    "icon_color" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "quiz_format" text,
    "visibility" text,
    "created_by" text,
    "quiz_code" text,
    "code_generated_at" timestamp with time zone
);

-- Crea la tabella quiz_questions
CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" uuid PRIMARY KEY,
    "quiz_id" uuid,
    "question_text" text NOT NULL,
    "options" jsonb NOT NULL,
    "correct_answer" integer NOT NULL,
    "explanation" text,
    "image_url" text,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Crea la tabella subscriptions
CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" uuid PRIMARY KEY,
    "customer_email" text NOT NULL,
    "subscription_id" text,
    "plan_id" text,
    "status" text,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "billing_interval" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "user_id" uuid,
    "payment_method" text,
    "suspended_at" timestamp with time zone,
    "suspended_reason" text,
    "last_payment_status" text,
    "next_payment_attempt" timestamp with time zone,
    "renewal_attempts" integer DEFAULT 0,
    "last_renewal_attempt" timestamp with time zone,
    "renewal_error" text,
    "suspension_end_date" timestamp with time zone,
    "plan_change_scheduled_at" timestamp with time zone,
    "plan_change_to" text,
    "payment_method_id" text,
    "payment_method_last4" text,
    "payment_method_brand" text,
    "payment_method_exp_month" integer,
    "payment_method_exp_year" integer,
    "notes" text,
    "access_code_id" uuid
);

-- Inserisci i dati nella tabella quiz_types
INSERT INTO "public"."quiz_types" ("id", "name", "description", "created_at") VALUES
('ec6aff76-cdc9-4ae5-abdc-110cb3c59bb7', 'Patente Nautica', 'Quiz per la preparazione all''esame della patente nautica', '2023-10-12T14:30:00Z'),
('f8c4a3d2-b7e1-5f9a-8c6d-2e3b4a5c6d7e', 'Modulo di Apprendimento', 'Quiz formativi su argomenti specifici con durata flessibile', '2025-01-16T16:29:37.118059+00:00');

-- Riabilita i vincoli di chiave esterna
SET session_replication_role = 'origin'; 
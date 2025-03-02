/*
  # Add new quiz categories and data

  1. New Data
    - Add new quiz templates for different categories
    - Add corresponding questions for each quiz
    - Categories: Navigation, Safety, Weather, Regulations

  2. Notes
    - Each quiz has multiple questions
    - Questions include explanations for learning purposes
*/

-- Insert new quiz templates
INSERT INTO quiz_templates (title, description, quiz_type, category, question_count, duration_minutes)
VALUES
  ('Navigazione Costiera', 'Quiz sulla navigazione costiera e pianificazione della rotta', 'learning', 'Navigation', 10, 20),
  ('Sicurezza in Mare', 'Test sulle procedure di sicurezza e emergenza', 'learning', 'Safety', 8, 15),
  ('Meteorologia Nautica', 'Quiz sulla previsione e interpretazione delle condizioni meteo', 'learning', 'Weather', 12, 25),
  ('Normative Nautiche', 'Test sulle regolamentazioni e normative della navigazione', 'learning', 'Regulations', 10, 20);

-- Insert questions for Navigation quiz
WITH nav_quiz AS (
  SELECT id FROM quiz_templates WHERE title = 'Navigazione Costiera' LIMIT 1
)
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, explanation)
SELECT 
  nav_quiz.id,
  q.question_text,
  q.options,
  q.correct_answer,
  q.explanation
FROM nav_quiz, (VALUES
  (
    'Come si calcola la velocità di una barca in nodi?',
    '["Miglia nautiche per ora", "Chilometri per ora", "Metri al secondo", "Piedi al minuto"]'::jsonb,
    0,
    'Un nodo equivale a una miglio nautico all''ora (1.852 km/h)'
  ),
  (
    'Quale strumento si usa per misurare la profondità dell''acqua?',
    '["Ecoscandaglio", "Anemometro", "Barometro", "Igrometro"]'::jsonb,
    0,
    'L''ecoscandaglio usa onde sonore per misurare la profondità dell''acqua'
  )
) AS q(question_text, options, correct_answer, explanation);

-- Insert questions for Safety quiz
WITH safety_quiz AS (
  SELECT id FROM quiz_templates WHERE title = 'Sicurezza in Mare' LIMIT 1
)
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, explanation)
SELECT 
  safety_quiz.id,
  q.question_text,
  q.options,
  q.correct_answer,
  q.explanation
FROM safety_quiz, (VALUES
  (
    'Quale è il segnale internazionale di soccorso?',
    '["MAYDAY", "SOS", "HELP", "EMERGENCY"]'::jsonb,
    0,
    'MAYDAY è il segnale vocale internazionale di soccorso, derivato dal francese "m''aider"'
  ),
  (
    'Quanti giubbotti salvagente devono essere presenti a bordo?',
    '["Uno per ogni persona", "Due per barca", "Tre per barca", "Uno ogni due persone"]'::jsonb,
    0,
    'È obbligatorio avere un giubbotto salvagente per ogni persona a bordo'
  )
) AS q(question_text, options, correct_answer, explanation);

-- Insert questions for Weather quiz
WITH weather_quiz AS (
  SELECT id FROM quiz_templates WHERE title = 'Meteorologia Nautica' LIMIT 1
)
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, explanation)
SELECT 
  weather_quiz.id,
  q.question_text,
  q.options,
  q.correct_answer,
  q.explanation
FROM weather_quiz, (VALUES
  (
    'Come si misura la forza del vento in mare?',
    '["Scala Beaufort", "Scala Richter", "Scala Celsius", "Scala Douglas"]'::jsonb,
    0,
    'La scala Beaufort misura la forza del vento da 0 (calma) a 12 (uragano)'
  ),
  (
    'Cosa indica un barometro che scende rapidamente?',
    '["Arrivo di una perturbazione", "Bel tempo in arrivo", "Nebbia in arrivo", "Temperatura in aumento"]'::jsonb,
    0,
    'Un rapido calo della pressione atmosferica indica l''arrivo di una perturbazione'
  )
) AS q(question_text, options, correct_answer, explanation);

-- Insert questions for Regulations quiz
WITH reg_quiz AS (
  SELECT id FROM quiz_templates WHERE title = 'Normative Nautiche' LIMIT 1
)
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, explanation)
SELECT 
  reg_quiz.id,
  q.question_text,
  q.options,
  q.correct_answer,
  q.explanation
FROM reg_quiz, (VALUES
  (
    'Qual è la distanza massima dalla costa per la navigazione senza patente?',
    '["6 miglia", "12 miglia", "3 miglia", "1 miglio"]'::jsonb,
    0,
    'In Italia, si può navigare fino a 6 miglia dalla costa senza patente nautica con alcune limitazioni'
  ),
  (
    'Quale documento è obbligatorio per una barca da diporto?',
    '["Licenza di navigazione", "Patente nautica", "Certificato di proprietà", "Libretto del motore"]'::jsonb,
    0,
    'La licenza di navigazione è obbligatoria per le imbarcazioni sopra i 10 metri'
  )
) AS q(question_text, options, correct_answer, explanation);
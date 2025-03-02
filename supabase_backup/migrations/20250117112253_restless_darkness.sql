/*
  # Add exam quiz templates and questions

  1. New Data
    - Add exam quiz templates for different license types
    - Add corresponding exam questions
    - Categories: Basic License, Advanced License

  2. Notes
    - Each exam has 20 questions
    - Fixed duration of 30 minutes
    - Questions cover multiple topics
*/

-- Insert exam quiz templates
INSERT INTO quiz_templates (title, description, quiz_type, category, question_count, duration_minutes)
VALUES
  ('Esame Patente Entro 12 Miglia', 'Simulazione esame per patente nautica entro le 12 miglia', 'exam', 'Basic License', 20, 30),
  ('Esame Patente Senza Limiti', 'Simulazione esame per patente nautica senza limiti dalla costa', 'exam', 'Advanced License', 20, 30);

-- Insert questions for Basic License exam
WITH basic_exam AS (
  SELECT id FROM quiz_templates WHERE title = 'Esame Patente Entro 12 Miglia' LIMIT 1
)
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, explanation)
SELECT 
  basic_exam.id,
  q.question_text,
  q.options,
  q.correct_answer,
  q.explanation
FROM basic_exam, (VALUES
  (
    'Quale è la velocità massima consentita entro 300 metri dalla costa?',
    '["3 nodi", "5 nodi", "10 nodi", "15 nodi"]'::jsonb,
    0,
    'Il limite di velocità entro 300 metri dalla costa è di 3 nodi per garantire la sicurezza dei bagnanti'
  ),
  (
    'In caso di incrocio tra due imbarcazioni a motore, quale ha la precedenza?',
    '["L''imbarcazione che proviene da dritta", "L''imbarcazione che proviene da sinistra", "L''imbarcazione più grande", "L''imbarcazione più veloce"]'::jsonb,
    0,
    'La regola generale prevede che abbia la precedenza l''imbarcazione che proviene da dritta'
  ),
  (
    'Cosa indica una boa di colore giallo?',
    '["Area speciale", "Pericolo isolato", "Cardinal Nord", "Cardinal Sud"]'::jsonb,
    0,
    'Le boe gialle indicano aree speciali come zone di balneazione o aree protette'
  )
) AS q(question_text, options, correct_answer, explanation);

-- Insert questions for Advanced License exam
WITH advanced_exam AS (
  SELECT id FROM quiz_templates WHERE title = 'Esame Patente Senza Limiti' LIMIT 1
)
INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, explanation)
SELECT 
  advanced_exam.id,
  q.question_text,
  q.options,
  q.correct_answer,
  q.explanation
FROM advanced_exam, (VALUES
  (
    'Come si determina la posizione utilizzando il sestante?',
    '["Misurando l''altezza degli astri", "Usando il GPS", "Consultando le carte", "Usando il radar"]'::jsonb,
    0,
    'Il sestante misura l''altezza degli astri rispetto all''orizzonte per determinare la posizione'
  ),
  (
    'Quale scala si usa per misurare l''intensità di un ciclone tropicale?',
    '["Scala Saffir-Simpson", "Scala Beaufort", "Scala Douglas", "Scala Richter"]'::jsonb,
    0,
    'La scala Saffir-Simpson classifica i cicloni tropicali da categoria 1 a 5'
  ),
  (
    'Come si calcola la deviazione magnetica?',
    '["Confrontando la bussola con il Nord vero", "Usando il GPS", "Consultando le effemeridi", "Misurando la corrente"]'::jsonb,
    0,
    'La deviazione magnetica si calcola confrontando l''indicazione della bussola con il Nord vero'
  )
) AS q(question_text, options, correct_answer, explanation);
-- Insert sample interactive quiz templates
INSERT INTO interactive_quiz_templates (
  title,
  description,
  visibility,
  quiz_format,
  question_count,
  duration_minutes,
  icon,
  icon_color,
  host_email
) VALUES
  (
    'Quiz Rapido: Navigazione Base',
    'Test veloce sulle nozioni base della navigazione',
    'public',
    'multiple_choice',
    5,
    10,
    'compass',
    'blue',
    'instructor@example.com'
  ),
  (
    'Quiz Interattivo: Sicurezza in Mare',
    'Quiz interattivo sulle procedure di sicurezza',
    'public',
    'multiple_choice',
    8,
    15,
    'shield',
    'red',
    'instructor@example.com'
  ),
  (
    'Quiz Vero/Falso: Regole Nautiche',
    'Test rapido sulle regole base della navigazione',
    'public',
    'true_false',
    10,
    12,
    'book',
    'green',
    'instructor@example.com'
  );

-- Insert questions for navigation quiz
WITH nav_quiz AS (
  SELECT id FROM interactive_quiz_templates WHERE title = 'Quiz Rapido: Navigazione Base' LIMIT 1
)
INSERT INTO interactive_quiz_questions (
  quiz_id,
  question_text,
  options,
  correct_answer,
  explanation
)
SELECT 
  nav_quiz.id,
  q.question_text,
  q.options,
  q.correct_answer,
  q.explanation
FROM nav_quiz, (VALUES
  (
    'Quale è il lato destro di una barca?',
    '["Dritta", "Sinistra", "Prua", "Poppa"]'::jsonb,
    0,
    'La dritta è il lato destro della barca guardando verso prua'
  ),
  (
    'Come si chiama la parte posteriore della barca?',
    '["Prua", "Poppa", "Murata", "Chiglia"]'::jsonb,
    1,
    'La poppa è la parte posteriore della barca'
  ),
  (
    'Quale strumento si usa per determinare la rotta?',
    '["Bussola", "Anemometro", "Ecoscandaglio", "Barometro"]'::jsonb,
    0,
    'La bussola è lo strumento principale per determinare la rotta'
  )
) AS q(question_text, options, correct_answer, explanation);

-- Insert questions for safety quiz
WITH safety_quiz AS (
  SELECT id FROM interactive_quiz_templates WHERE title = 'Quiz Interattivo: Sicurezza in Mare' LIMIT 1
)
INSERT INTO interactive_quiz_questions (
  quiz_id,
  question_text,
  options,
  correct_answer,
  explanation
)
SELECT 
  safety_quiz.id,
  q.question_text,
  q.options,
  q.correct_answer,
  q.explanation
FROM safety_quiz, (VALUES
  (
    'Quanti giubbotti salvagente devono essere presenti a bordo?',
    '["Uno per ogni persona", "Due per barca", "Uno ogni due persone", "Solo per i bambini"]'::jsonb,
    0,
    'È obbligatorio avere un giubbotto salvagente per ogni persona a bordo'
  ),
  (
    'Quale è il segnale internazionale di soccorso?',
    '["MAYDAY", "HELP", "SOS", "EMERGENCY"]'::jsonb,
    0,
    'MAYDAY è il segnale vocale internazionale di soccorso'
  ),
  (
    'In caso di uomo a mare, quale è la prima cosa da fare?',
    '["Gridare ''Uomo a mare'' e indicare la posizione", "Saltare in acqua", "Chiamare i soccorsi", "Spegnere i motori"]'::jsonb,
    0,
    'È fondamentale allertare immediatamente l''equipaggio e mantenere il contatto visivo'
  )
) AS q(question_text, options, correct_answer, explanation);

-- Insert questions for rules quiz
WITH rules_quiz AS (
  SELECT id FROM interactive_quiz_templates WHERE title = 'Quiz Vero/Falso: Regole Nautiche' LIMIT 1
)
INSERT INTO interactive_quiz_questions (
  quiz_id,
  question_text,
  options,
  correct_answer,
  explanation
)
SELECT 
  rules_quiz.id,
  q.question_text,
  q.options,
  q.correct_answer,
  q.explanation
FROM rules_quiz, (VALUES
  (
    'La velocità massima consentita entro 300m dalla costa è di 10 nodi',
    '["Vero", "Falso"]'::jsonb,
    1,
    'Falso, il limite è di 3 nodi entro 300m dalla costa'
  ),
  (
    'In caso di incrocio, le imbarcazioni a vela hanno la precedenza su quelle a motore',
    '["Vero", "Falso"]'::jsonb,
    0,
    'Vero, le imbarcazioni a vela hanno sempre la precedenza su quelle a motore'
  ),
  (
    'È obbligatorio avere a bordo le carte nautiche della zona di navigazione',
    '["Vero", "Falso"]'::jsonb,
    0,
    'Vero, è obbligatorio avere a bordo le carte nautiche aggiornate dell''area di navigazione'
  )
) AS q(question_text, options, correct_answer, explanation);
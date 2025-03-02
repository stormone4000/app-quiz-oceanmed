-- Insert sample interactive quiz templates
DO $$ 
DECLARE
  nav_quiz_id uuid;
  safety_quiz_id uuid;
  rules_quiz_id uuid;
BEGIN
  -- Insert navigation quiz
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
  ) VALUES (
    'Quiz Rapido: Navigazione Base',
    'Test veloce sulle nozioni base della navigazione',
    'public',
    'multiple_choice',
    5,
    10,
    'compass',
    'blue',
    'instructor@example.com'
  ) RETURNING id INTO nav_quiz_id;

  -- Insert safety quiz
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
  ) VALUES (
    'Quiz Interattivo: Sicurezza in Mare',
    'Quiz interattivo sulle procedure di sicurezza',
    'public',
    'multiple_choice',
    8,
    15,
    'shield',
    'red',
    'instructor@example.com'
  ) RETURNING id INTO safety_quiz_id;

  -- Insert rules quiz
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
  ) VALUES (
    'Quiz Vero/Falso: Regole Nautiche',
    'Test rapido sulle regole base della navigazione',
    'public',
    'true_false',
    10,
    12,
    'book',
    'green',
    'instructor@example.com'
  ) RETURNING id INTO rules_quiz_id;

  -- Insert questions for navigation quiz
  INSERT INTO interactive_quiz_questions (
    quiz_id,
    question_text,
    options,
    correct_answer,
    explanation
  ) VALUES
    (
      nav_quiz_id,
      'Quale è il lato destro di una barca?',
      '["Dritta", "Sinistra", "Prua", "Poppa"]'::jsonb,
      0,
      'La dritta è il lato destro della barca guardando verso prua'
    ),
    (
      nav_quiz_id,
      'Come si chiama la parte posteriore della barca?',
      '["Prua", "Poppa", "Murata", "Chiglia"]'::jsonb,
      1,
      'La poppa è la parte posteriore della barca'
    ),
    (
      nav_quiz_id,
      'Quale strumento si usa per determinare la rotta?',
      '["Bussola", "Anemometro", "Ecoscandaglio", "Barometro"]'::jsonb,
      0,
      'La bussola è lo strumento principale per determinare la rotta'
    );

  -- Insert questions for safety quiz
  INSERT INTO interactive_quiz_questions (
    quiz_id,
    question_text,
    options,
    correct_answer,
    explanation
  ) VALUES
    (
      safety_quiz_id,
      'Quanti giubbotti salvagente devono essere presenti a bordo?',
      '["Uno per ogni persona", "Due per barca", "Uno ogni due persone", "Solo per i bambini"]'::jsonb,
      0,
      'È obbligatorio avere un giubbotto salvagente per ogni persona a bordo'
    ),
    (
      safety_quiz_id,
      'Quale è il segnale internazionale di soccorso?',
      '["MAYDAY", "HELP", "SOS", "EMERGENCY"]'::jsonb,
      0,
      'MAYDAY è il segnale vocale internazionale di soccorso'
    ),
    (
      safety_quiz_id,
      'In caso di uomo a mare, quale è la prima cosa da fare?',
      '["Gridare ''Uomo a mare'' e indicare la posizione", "Saltare in acqua", "Chiamare i soccorsi", "Spegnere i motori"]'::jsonb,
      0,
      'È fondamentale allertare immediatamente l''equipaggio e mantenere il contatto visivo'
    );

  -- Insert questions for rules quiz
  INSERT INTO interactive_quiz_questions (
    quiz_id,
    question_text,
    options,
    correct_answer,
    explanation
  ) VALUES
    (
      rules_quiz_id,
      'La velocità massima consentita entro 300m dalla costa è di 10 nodi',
      '["Vero", "Falso"]'::jsonb,
      1,
      'Falso, il limite è di 3 nodi entro 300m dalla costa'
    ),
    (
      rules_quiz_id,
      'In caso di incrocio, le imbarcazioni a vela hanno la precedenza su quelle a motore',
      '["Vero", "Falso"]'::jsonb,
      0,
      'Vero, le imbarcazioni a vela hanno sempre la precedenza su quelle a motore'
    ),
    (
      rules_quiz_id,
      'È obbligatorio avere a bordo le carte nautiche della zona di navigazione',
      '["Vero", "Falso"]'::jsonb,
      0,
      'Vero, è obbligatorio avere a bordo le carte nautiche aggiornate dell''area di navigazione'
    );
END $$;
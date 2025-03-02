-- Seed data for the database
-- This file will be executed when running `supabase start`

-- Insert quiz types
INSERT INTO quiz_types (id, name, description, created_at)
VALUES 
  (10, 'Patente Nautica', 'Quiz per la patente nautica', NOW()),
  (11, 'Esercitazione', 'Quiz di esercitazione', NOW()),
  (12, 'Test', 'Quiz di test', NOW());

-- Insert some questions
INSERT INTO questions (id, question_text, options, correct_option, explanation, difficulty, created_at)
VALUES 
  (100, 'Qual è la parte anteriore di una nave?', '["Poppa", "Prua", "Murata", "Chiglia"]', 1, 'La prua è la parte anteriore di una nave.', 'easy', NOW()),
  (101, 'Quale strumento si usa per misurare la profondità dell''acqua?', '["Bussola", "Scandaglio", "Anemometro", "Barometro"]', 1, 'Lo scandaglio è lo strumento usato per misurare la profondità dell''acqua.', 'medium', NOW()),
  (102, 'Cosa indica il termine "sottovento"?', '["La direzione da cui soffia il vento", "La direzione verso cui soffia il vento", "La zona protetta dal vento", "La zona esposta al vento"]', 1, 'Sottovento indica la direzione verso cui soffia il vento.', 'hard', NOW());

-- Insert a quiz template
INSERT INTO quiz_templates (id, title, description, time_limit, passing_score, created_at, quiz_type_id)
VALUES 
  (100, 'Quiz di Prova', 'Un quiz di prova per testare la piattaforma', 30, 60, NOW(), 10);

-- Link questions to the quiz template
INSERT INTO quiz_questions (id, quiz_template_id, question_id, position, created_at)
VALUES 
  (100, 100, 100, 1, NOW()),
  (101, 100, 101, 2, NOW()),
  (102, 100, 102, 3, NOW()); 
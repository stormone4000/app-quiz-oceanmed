/*
  # Update quiz titles

  1. Changes
    - Update learning module titles to be more descriptive
    - Update exam quiz titles to match the desired format
    - Maintain existing quiz content and structure

  2. Notes
    - Only updates titles, preserves all other quiz data
    - Ensures consistent naming across the application
*/

-- Update learning module titles
UPDATE quiz_templates
SET 
  title = 'Modulo Base di Navigazione',
  description = 'Concetti fondamentali di navigazione costiera e pianificazione della rotta'
WHERE title = 'Navigazione Costiera' AND quiz_type = 'learning';

UPDATE quiz_templates
SET 
  title = 'Modulo Sicurezza in Mare',
  description = 'Procedure di sicurezza, emergenza e prevenzione dei rischi'
WHERE title = 'Sicurezza in Mare' AND quiz_type = 'learning';

UPDATE quiz_templates
SET 
  title = 'Modulo Meteorologia',
  description = 'Studio delle condizioni meteo e loro impatto sulla navigazione'
WHERE title = 'Meteorologia Nautica' AND quiz_type = 'learning';

UPDATE quiz_templates
SET 
  title = 'Modulo Normative e Regolamenti',
  description = 'Regolamentazioni e normative essenziali per la navigazione'
WHERE title = 'Normative Nautiche' AND quiz_type = 'learning';

-- Update exam titles
UPDATE quiz_templates
SET 
  title = 'Quiz Patente Nautica Entro 12 Miglia',
  description = 'Simulazione completa dell''esame per patente nautica entro le 12 miglia dalla costa'
WHERE title = 'Esame Patente Entro 12 Miglia' AND quiz_type = 'exam';

UPDATE quiz_templates
SET 
  title = 'Quiz Patente Nautica Senza Limiti',
  description = 'Simulazione completa dell''esame per patente nautica senza limiti dalla costa'
WHERE title = 'Esame Patente Senza Limiti' AND quiz_type = 'exam';
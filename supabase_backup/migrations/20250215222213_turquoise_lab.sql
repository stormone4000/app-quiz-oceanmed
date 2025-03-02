/*
  # Remove Legacy Quiz Tables
  
  1. Changes
    - Drop unused legacy tables:
      - quiz_submissions
      - quizzes
    
  2. Notes
    - These tables are no longer used and have been replaced by:
      - quiz_templates
      - quiz_questions 
      - results
      - interactive_quiz_templates
      - interactive_quiz_questions
      - live_quiz_sessions
      - live_quiz_participants
      - live_quiz_results
*/

-- Drop legacy tables if they exist
DROP TABLE IF EXISTS quiz_submissions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
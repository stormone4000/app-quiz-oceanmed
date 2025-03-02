/*
  # Add More Quiz Questions

  1. Changes
    - Add new quiz for Weather & Navigation
    - Add 3 new questions with 3 options each
*/

-- Insert new quiz
INSERT INTO quizzes (title, description, category) VALUES
  ('Weather & Navigation Quiz', 'Test your knowledge of weather patterns and navigation', 'Weather & Navigation');

-- Insert new questions
DO $$
DECLARE
  weather_quiz_id uuid;
BEGIN
  -- Get quiz ID
  SELECT id INTO weather_quiz_id FROM quizzes WHERE category = 'Weather & Navigation' LIMIT 1;

  -- Insert questions for Weather & Navigation quiz
  INSERT INTO questions (quiz_id, text, options, correct_answer, time_limit)
  VALUES
    (weather_quiz_id, 
     'What weather condition is indicated by a rapidly falling barometer?', 
     '["Approaching storm", "Clear skies", "Stable conditions"]'::jsonb, 
     0, 
     30),
    (weather_quiz_id, 
     'Which instrument is used to measure wind speed?', 
     '["Anemometer", "Barometer", "Hygrometer"]'::jsonb, 
     0, 
     30),
    (weather_quiz_id, 
     'What is the primary purpose of a nautical almanac?', 
     '["Celestial navigation", "Weather forecasting", "Tide prediction"]'::jsonb, 
     0, 
     30);
END $$;
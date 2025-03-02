-- Update live_quiz_results table schema
ALTER TABLE live_quiz_results
ADD COLUMN IF NOT EXISTS score numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS participant_details jsonb DEFAULT '[]'::jsonb;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS live_quiz_results_score_idx ON live_quiz_results(score);
CREATE INDEX IF NOT EXISTS live_quiz_results_participant_details_gin_idx ON live_quiz_results USING gin(participant_details);

-- Update existing records to calculate score from participant details
UPDATE live_quiz_results
SET score = COALESCE(average_score, 0)
WHERE score = 0;

-- Create or replace function to calculate average score
CREATE OR REPLACE FUNCTION calculate_quiz_result_score()
RETURNS trigger AS $$
BEGIN
  -- Calculate average score from participant details
  NEW.score := NEW.average_score;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate score
DROP TRIGGER IF EXISTS calculate_quiz_result_score_trigger ON live_quiz_results;
CREATE TRIGGER calculate_quiz_result_score_trigger
  BEFORE INSERT OR UPDATE ON live_quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quiz_result_score();
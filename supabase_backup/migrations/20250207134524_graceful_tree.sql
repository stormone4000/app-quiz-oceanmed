-- Add last_update column to live_quiz_sessions
ALTER TABLE live_quiz_sessions
ADD COLUMN IF NOT EXISTS last_update timestamptz DEFAULT now();

-- Create trigger to automatically update last_update
CREATE OR REPLACE FUNCTION update_live_quiz_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_update = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_live_quiz_session_timestamp
  BEFORE UPDATE ON live_quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_live_quiz_session_timestamp();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS live_quiz_sessions_last_update_idx ON live_quiz_sessions(last_update);

-- Add quiz_data column if it doesn't exist
ALTER TABLE live_quiz_sessions
ADD COLUMN IF NOT EXISTS quiz_data jsonb;
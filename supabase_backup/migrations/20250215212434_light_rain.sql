-- Add participant_email column to live_quiz_sessions
ALTER TABLE live_quiz_sessions
ADD COLUMN IF NOT EXISTS participant_email text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS live_quiz_sessions_participant_email_idx ON live_quiz_sessions(participant_email);

-- Add participant_email column to live_quiz_participants if it doesn't exist
ALTER TABLE live_quiz_participants
ADD COLUMN IF NOT EXISTS participant_email text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS live_quiz_participants_participant_email_idx ON live_quiz_participants(participant_email);

-- Update existing sessions with participant email from participants
UPDATE live_quiz_sessions ls
SET participant_email = (
  SELECT participant_email 
  FROM live_quiz_participants lp 
  WHERE lp.session_id = ls.id 
  LIMIT 1
)
WHERE participant_email IS NULL;
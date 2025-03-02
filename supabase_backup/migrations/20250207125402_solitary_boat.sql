-- Add tables to realtime publication if not already added
DO $$ 
BEGIN
  -- Check if tables are already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'live_quiz_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_quiz_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'live_quiz_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_quiz_participants;
  END IF;
END $$;

-- Create realtime policies for live_quiz_sessions
CREATE POLICY "Enable realtime for all users on live_quiz_sessions"
ON live_quiz_sessions
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable realtime insert for all users on live_quiz_sessions"
ON live_quiz_sessions
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable realtime update for all users on live_quiz_sessions"
ON live_quiz_sessions
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Create realtime policies for live_quiz_participants
CREATE POLICY "Enable realtime for all users on live_quiz_participants"
ON live_quiz_participants
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable realtime insert for all users on live_quiz_participants"
ON live_quiz_participants
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable realtime update for all users on live_quiz_participants"
ON live_quiz_participants
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Create realtime policies for quiz_questions
CREATE POLICY "Enable realtime for all users on quiz_questions"
ON quiz_questions
FOR SELECT
TO public
USING (true);

-- Create realtime policies for quiz_templates
CREATE POLICY "Enable realtime for all users on quiz_templates"
ON quiz_templates
FOR SELECT
TO public
USING (true);
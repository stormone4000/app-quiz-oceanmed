-- Add live quiz results table if it doesn't exist
DO $$ 
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'live_quiz_results'
  ) THEN
    CREATE TABLE live_quiz_results (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES live_quiz_sessions(id) ON DELETE CASCADE,
      quiz_id uuid REFERENCES interactive_quiz_templates(id),
      host_email text NOT NULL,
      total_participants integer NOT NULL DEFAULT 0,
      average_score numeric NOT NULL DEFAULT 0,
      completion_rate numeric NOT NULL DEFAULT 0,
      duration_minutes integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE live_quiz_results ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Public can view live quiz results"
      ON live_quiz_results FOR SELECT
      TO public
      USING (true);

    CREATE POLICY "Public can insert live quiz results"
      ON live_quiz_results FOR INSERT
      TO public
      WITH CHECK (true);

    -- Create indexes
    CREATE INDEX live_quiz_results_session_id_idx ON live_quiz_results(session_id);
    CREATE INDEX live_quiz_results_quiz_id_idx ON live_quiz_results(quiz_id);
    CREATE INDEX live_quiz_results_host_email_idx ON live_quiz_results(host_email);
    CREATE INDEX live_quiz_results_created_at_idx ON live_quiz_results(created_at);
  END IF;
END $$;
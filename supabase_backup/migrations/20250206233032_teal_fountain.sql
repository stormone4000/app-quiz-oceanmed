/*
  # Add live quiz functionality

  1. Add missing columns
    - Add visibility and quiz_type to live_quiz_sessions if they don't exist
  
  2. Update indexes and policies
    - Add any missing indexes
    - Update policies if needed
*/

-- Add new columns to live_quiz_sessions if they don't exist
DO $$ 
BEGIN
  -- Add visibility column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'live_quiz_sessions' 
    AND column_name = 'visibility'
  ) THEN
    ALTER TABLE live_quiz_sessions 
    ADD COLUMN visibility text NOT NULL DEFAULT 'private' 
    CHECK (visibility IN ('private', 'public'));
  END IF;

  -- Add quiz_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'live_quiz_sessions' 
    AND indexname = 'live_quiz_sessions_quiz_type_idx'
  ) THEN
    ALTER TABLE live_quiz_sessions 
    ADD COLUMN quiz_type text NOT NULL DEFAULT 'multiple_choice' 
    CHECK (quiz_type IN ('multiple_choice', 'true_false'));
  END IF;
END $$;

-- Create missing policies if they don't exist
DO $$ 
BEGIN
  -- Policies for live_quiz_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'live_quiz_sessions' 
    AND policyname = 'Public can view live quiz sessions'
  ) THEN
    CREATE POLICY "Public can view live quiz sessions"
      ON live_quiz_sessions FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'live_quiz_sessions' 
    AND policyname = 'Public can manage live quiz sessions'
  ) THEN
    CREATE POLICY "Public can manage live quiz sessions"
      ON live_quiz_sessions FOR ALL
      TO public
      WITH CHECK (true);
  END IF;

  -- Policies for live_quiz_participants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'live_quiz_participants' 
    AND policyname = 'Public can view live quiz participants'
  ) THEN
    CREATE POLICY "Public can view live quiz participants"
      ON live_quiz_participants FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'live_quiz_participants' 
    AND policyname = 'Public can manage live quiz participants'
  ) THEN
    CREATE POLICY "Public can manage live quiz participants"
      ON live_quiz_participants FOR ALL
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Create missing indexes if they don't exist
DO $$ 
BEGIN
  -- Host email index
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'live_quiz_sessions' 
    AND indexname = 'live_quiz_sessions_host_email_idx'
  ) THEN
    CREATE INDEX live_quiz_sessions_host_email_idx ON live_quiz_sessions(host_email);
  END IF;

  -- Quiz type index
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'live_quiz_sessions' 
    AND indexname = 'live_quiz_sessions_quiz_type_idx'
  ) THEN
    CREATE INDEX live_quiz_sessions_quiz_type_idx ON live_quiz_sessions(quiz_type);
  END IF;

  -- Visibility index
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'live_quiz_sessions' 
    AND indexname = 'live_quiz_sessions_visibility_idx'
  ) THEN
    CREATE INDEX live_quiz_sessions_visibility_idx ON live_quiz_sessions(visibility);
  END IF;
END $$;
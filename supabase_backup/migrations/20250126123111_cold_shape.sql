-- Add notes column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS notes text;

-- Create index for better performance when searching notes
CREATE INDEX IF NOT EXISTS subscriptions_notes_idx ON subscriptions(notes);
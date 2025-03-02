/*
  # Notifications System Schema

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `content` (text, required)
      - `category` (text, enum: announcement, event, alert)
      - `is_important` (boolean)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz, nullable)

    - `notification_read_status`
      - `id` (uuid, primary key)
      - `notification_id` (uuid, references notifications)
      - `student_email` (text)
      - `read_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (read/write)
*/

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) <= 100),
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('announcement', 'event', 'alert')),
  is_important boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Create notification_read_status table
CREATE TABLE notification_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(notification_id, student_email)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_read_status ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Public can view notifications"
  ON notifications FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create notifications"
  ON notifications FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update notifications"
  ON notifications FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete notifications"
  ON notifications FOR DELETE
  TO public
  USING (true);

-- Create policies for notification_read_status
CREATE POLICY "Public can view notification read status"
  ON notification_read_status FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can create notification read status"
  ON notification_read_status FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX notifications_created_at_idx ON notifications(created_at);
CREATE INDEX notifications_category_idx ON notifications(category);
CREATE INDEX notifications_expires_at_idx ON notifications(expires_at);
CREATE INDEX notification_read_status_student_email_idx ON notification_read_status(student_email);
CREATE INDEX notification_read_status_notification_id_idx ON notification_read_status(notification_id);
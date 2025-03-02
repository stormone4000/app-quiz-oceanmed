-- Add new columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspended_reason text,
ADD COLUMN IF NOT EXISTS last_payment_status text,
ADD COLUMN IF NOT EXISTS next_payment_attempt timestamptz;

-- Create subscription_events table for detailed history
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'renewed', 'suspended', 'reactivated', 'plan_changed', 'payment_failed', 'canceled')),
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create subscription_notifications table
CREATE TABLE IF NOT EXISTS subscription_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('expiring_soon', 'expired', 'payment_failed', 'renewed', 'plan_changed')),
  sent_to text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz,
  content text NOT NULL
);

-- Enable RLS
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view subscription events"
  ON subscription_events FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public can view subscription notifications"
  ON subscription_notifications FOR SELECT
  TO public
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS subscription_events_subscription_id_idx ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS subscription_events_event_type_idx ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS subscription_notifications_subscription_id_idx ON subscription_notifications(subscription_id);
CREATE INDEX IF NOT EXISTS subscription_notifications_type_idx ON subscription_notifications(type);
CREATE INDEX IF NOT EXISTS subscription_notifications_sent_to_idx ON subscription_notifications(sent_to);

-- Create function to handle subscription events
CREATE OR REPLACE FUNCTION log_subscription_event(
  p_subscription_id uuid,
  p_event_type text,
  p_old_value jsonb DEFAULT NULL,
  p_new_value jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO subscription_events (
    subscription_id,
    event_type,
    old_value,
    new_value,
    metadata
  ) VALUES (
    p_subscription_id,
    p_event_type,
    p_old_value,
    p_new_value,
    p_metadata
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to send subscription notification
CREATE OR REPLACE FUNCTION send_subscription_notification(
  p_subscription_id uuid,
  p_type text,
  p_content text
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
  v_customer_email text;
BEGIN
  -- Get customer email from subscription
  SELECT customer_email INTO v_customer_email
  FROM subscriptions
  WHERE id = p_subscription_id;

  IF v_customer_email IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  -- Insert notification
  INSERT INTO subscription_notifications (
    subscription_id,
    type,
    sent_to,
    content
  ) VALUES (
    p_subscription_id,
    p_type,
    v_customer_email,
    p_content
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to suspend subscription
CREATE OR REPLACE FUNCTION suspend_subscription(
  p_subscription_id uuid,
  p_reason text
) RETURNS void AS $$
BEGIN
  -- Update subscription status
  UPDATE subscriptions
  SET 
    status = 'suspended',
    suspended_at = now(),
    suspended_reason = p_reason
  WHERE id = p_subscription_id;

  -- Log event
  PERFORM log_subscription_event(
    p_subscription_id,
    'suspended',
    NULL,
    jsonb_build_object('reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to reactivate subscription
CREATE OR REPLACE FUNCTION reactivate_subscription(
  p_subscription_id uuid
) RETURNS void AS $$
BEGIN
  -- Update subscription status
  UPDATE subscriptions
  SET 
    status = 'active',
    suspended_at = NULL,
    suspended_reason = NULL
  WHERE id = p_subscription_id;

  -- Log event
  PERFORM log_subscription_event(
    p_subscription_id,
    'reactivated'
  );
END;
$$ LANGUAGE plpgsql;
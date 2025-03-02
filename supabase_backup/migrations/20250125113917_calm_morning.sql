-- Add new columns for subscription management
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS renewal_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_renewal_attempt timestamptz,
ADD COLUMN IF NOT EXISTS renewal_error text,
ADD COLUMN IF NOT EXISTS suspension_end_date timestamptz,
ADD COLUMN IF NOT EXISTS plan_change_scheduled_at timestamptz,
ADD COLUMN IF NOT EXISTS plan_change_to text;

-- Create subscription_actions table to track pending actions
CREATE TABLE IF NOT EXISTS subscription_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('renew', 'suspend', 'change_plan')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  params jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE subscription_actions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can manage subscription actions"
  ON subscription_actions FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS subscription_actions_subscription_id_idx ON subscription_actions(subscription_id);
CREATE INDEX IF NOT EXISTS subscription_actions_status_idx ON subscription_actions(status);
CREATE INDEX IF NOT EXISTS subscription_actions_action_type_idx ON subscription_actions(action_type);

-- Create function to schedule subscription renewal
CREATE OR REPLACE FUNCTION schedule_subscription_renewal(
  p_subscription_id uuid
) RETURNS uuid AS $$
DECLARE
  v_action_id uuid;
BEGIN
  -- Insert renewal action
  INSERT INTO subscription_actions (
    subscription_id,
    action_type,
    params
  ) VALUES (
    p_subscription_id,
    'renew',
    jsonb_build_object(
      'scheduled_at', now()
    )
  ) RETURNING id INTO v_action_id;

  -- Update subscription
  UPDATE subscriptions
  SET 
    renewal_attempts = 0,
    last_renewal_attempt = NULL,
    renewal_error = NULL
  WHERE id = p_subscription_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to schedule subscription suspension
CREATE OR REPLACE FUNCTION schedule_subscription_suspension(
  p_subscription_id uuid,
  p_end_date timestamptz DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_action_id uuid;
BEGIN
  -- Insert suspension action
  INSERT INTO subscription_actions (
    subscription_id,
    action_type,
    params
  ) VALUES (
    p_subscription_id,
    'suspend',
    jsonb_build_object(
      'end_date', p_end_date
    )
  ) RETURNING id INTO v_action_id;

  -- Update subscription
  UPDATE subscriptions
  SET suspension_end_date = p_end_date
  WHERE id = p_subscription_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to schedule plan change
CREATE OR REPLACE FUNCTION schedule_plan_change(
  p_subscription_id uuid,
  p_new_plan text,
  p_scheduled_at timestamptz DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_action_id uuid;
BEGIN
  -- Insert plan change action
  INSERT INTO subscription_actions (
    subscription_id,
    action_type,
    params
  ) VALUES (
    p_subscription_id,
    'change_plan',
    jsonb_build_object(
      'new_plan', p_new_plan,
      'scheduled_at', COALESCE(p_scheduled_at, now())
    )
  ) RETURNING id INTO v_action_id;

  -- Update subscription
  UPDATE subscriptions
  SET 
    plan_change_scheduled_at = COALESCE(p_scheduled_at, now()),
    plan_change_to = p_new_plan
  WHERE id = p_subscription_id;

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get pending subscription actions
CREATE OR REPLACE FUNCTION get_pending_subscription_actions(
  p_subscription_id uuid
) RETURNS TABLE (
  action_id uuid,
  action_type text,
  params jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    action_type,
    params,
    created_at
  FROM subscription_actions
  WHERE subscription_id = p_subscription_id
  AND status = 'pending'
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;
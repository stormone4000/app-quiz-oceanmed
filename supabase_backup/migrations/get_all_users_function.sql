-- Creiamo una funzione sicura per ottenere gli utenti
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  is_instructor BOOLEAN,
  account_status VARCHAR,
  subscription_status VARCHAR,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Verifica che l'utente corrente sia un amministratore
  IF NOT (SELECT (raw_app_meta_data->>'is_master')::boolean FROM auth.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Solo gli amministratori possono accedere a questi dati';
  END IF;
  
  -- Restituisci i dati degli utenti
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    (u.raw_user_meta_data->>'first_name')::VARCHAR AS first_name,
    (u.raw_user_meta_data->>'last_name')::VARCHAR AS last_name,
    (u.raw_app_meta_data->>'is_instructor')::BOOLEAN AS is_instructor,
    CASE 
      WHEN u.banned_until IS NOT NULL THEN 'suspended'
      ELSE 'active'
    END AS account_status,
    COALESCE(
      (SELECT 
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM subscriptions s 
            WHERE s.user_id = u.id 
            AND s.status = 'active' 
            AND s.end_date > NOW()
          ) THEN 'active'
          ELSE 'inactive'
        END
      ), 'inactive') AS subscription_status,
    u.last_sign_in_at AS last_login,
    u.created_at
  FROM auth.users u
  WHERE u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Concedi i permessi di esecuzione
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated; 
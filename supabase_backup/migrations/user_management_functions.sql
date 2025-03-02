-- Funzione per eliminare un utente
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica che l'utente corrente sia un amministratore
  IF NOT (SELECT (raw_app_meta_data->>'is_master')::boolean FROM auth.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Solo gli amministratori possono eliminare gli utenti';
  END IF;
  
  -- Imposta deleted_at invece di eliminare fisicamente
  UPDATE auth.users
  SET deleted_at = NOW()
  WHERE id = user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per sospendere/riattivare un utente
CREATE OR REPLACE FUNCTION toggle_user_suspension(user_id UUID, suspend BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica che l'utente corrente sia un amministratore
  IF NOT (SELECT (raw_app_meta_data->>'is_master')::boolean FROM auth.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Solo gli amministratori possono sospendere/riattivare gli utenti';
  END IF;
  
  -- Aggiorna lo stato di sospensione dell'utente
  UPDATE auth.users
  SET banned_until = CASE WHEN suspend THEN '9999-12-31'::TIMESTAMPTZ ELSE NULL END
  WHERE id = user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Concedi i permessi di esecuzione
GRANT EXECUTE ON FUNCTION delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_user_suspension(UUID, BOOLEAN) TO authenticated; 
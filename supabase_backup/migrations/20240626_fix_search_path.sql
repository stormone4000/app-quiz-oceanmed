-- Correzione del search_path per le funzioni critiche

-- Funzione get_dashboard_stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  tipo_utente text,
  totale bigint,
  attivi_ultimi_7_giorni bigint,
  quiz_completati bigint
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica che l'utente corrente sia un amministratore
  IF NOT (SELECT is_master FROM auth.users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Solo gli amministratori possono accedere a queste statistiche';
  END IF;

  RETURN QUERY
  WITH instructor_stats AS (
    SELECT 
      COUNT(*) as total_instructors,
      COUNT(CASE WHEN last_sign_in_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_instructors,
      COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as paying_instructors,
      COUNT(CASE 
        WHEN subscription_status = 'active' 
        AND last_sign_in_at >= NOW() - INTERVAL '7 days' 
        THEN 1 
      END) as active_paying_instructors
    FROM auth.users
    WHERE (raw_app_metadata->>'is_instructor')::boolean = true
  ),
  student_stats AS (
    SELECT 
      COUNT(*) as total_students,
      COUNT(CASE WHEN last_sign_in_at >= NOW() - INTERVAL '7 days' THEN 1 END) as active_students
    FROM auth.users
    WHERE (raw_app_metadata->>'is_instructor')::boolean = false 
    AND (raw_app_metadata->>'is_master')::boolean = false
  ),
  quiz_stats AS (
    SELECT 
      COUNT(*) as total_quizzes,
      COUNT(DISTINCT student_id) as students_with_quizzes
    FROM results
  )
  SELECT 
    'Istruttori Paganti'::text as tipo_utente,
    paying_instructors as totale,
    active_paying_instructors as attivi_ultimi_7_giorni,
    0::bigint as quiz_completati
  FROM instructor_stats
  UNION ALL
  SELECT 
    'Studenti Iscritti'::text as tipo_utente,
    total_students as totale,
    active_students as attivi_ultimi_7_giorni,
    total_quizzes as quiz_completati
  FROM student_stats, quiz_stats;
END;
$$;

-- Funzione get_all_users
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
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

-- Funzione delete_user
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$;

-- Funzione toggle_user_suspension
CREATE OR REPLACE FUNCTION toggle_user_suspension(user_id UUID, suspend BOOLEAN)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
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
$$; 
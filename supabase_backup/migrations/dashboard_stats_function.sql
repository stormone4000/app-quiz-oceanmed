-- Funzione per ottenere le statistiche della dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  tipo_utente text,
  totale bigint,
  attivi_ultimi_7_giorni bigint,
  quiz_completati bigint
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Concedi i permessi di esecuzione
GRANT EXECUTE ON FUNCTION get_dashboard_stats() TO public; 
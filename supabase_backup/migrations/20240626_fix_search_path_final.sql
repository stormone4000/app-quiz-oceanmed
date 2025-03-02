-- Correzione del search_path per le funzioni rimanenti

-- Funzione register_attendance_v2
CREATE OR REPLACE FUNCTION register_attendance_v2(
  p_employee_id UUID,
  p_attendance_date DATE,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_attendance_id UUID;
BEGIN
  -- Verifica che l'utente possa gestire le presenze
  IF NOT can_manage_attendance() AND auth.uid() <> p_employee_id THEN
    RAISE EXCEPTION 'Non hai i permessi per registrare le presenze per questo dipendente';
  END IF;
  
  -- Inserisci il record di presenza
  INSERT INTO attendance_v2 (employee_id, attendance_date, status, notes, created_by)
  VALUES (p_employee_id, p_attendance_date, p_status, p_notes, auth.uid())
  RETURNING id INTO v_attendance_id;
  
  RETURN v_attendance_id;
END;
$$;

-- Funzione correct_attendance_v2
CREATE OR REPLACE FUNCTION correct_attendance_v2(
  p_attendance_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id UUID;
BEGIN
  -- Ottieni l'ID del dipendente per questo record di presenza
  SELECT employee_id INTO v_employee_id
  FROM attendance_v2
  WHERE id = p_attendance_id;
  
  -- Verifica che l'utente possa gestire le presenze
  IF NOT can_manage_attendance() AND auth.uid() <> v_employee_id THEN
    RAISE EXCEPTION 'Non hai i permessi per correggere le presenze per questo dipendente';
  END IF;
  
  -- Aggiorna il record di presenza
  UPDATE attendance_v2
  SET status = p_status,
      notes = p_notes,
      updated_at = NOW(),
      updated_by = auth.uid()
  WHERE id = p_attendance_id;
  
  RETURN FOUND;
END;
$$;

-- Funzione get_employee_attendance_summary_v2
CREATE OR REPLACE FUNCTION get_employee_attendance_summary_v2(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  attendance_date DATE,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  updated_at TIMESTAMPTZ,
  updated_by UUID
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica che l'utente possa visualizzare i dati del dipendente
  IF NOT can_view_employee_data(p_employee_id) THEN
    RAISE EXCEPTION 'Non hai i permessi per visualizzare le presenze di questo dipendente';
  END IF;
  
  -- Restituisci il riepilogo delle presenze
  RETURN QUERY
  SELECT a.attendance_date, a.status, a.notes, a.created_at, a.created_by, a.updated_at, a.updated_by
  FROM attendance_v2 a
  WHERE a.employee_id = p_employee_id
    AND a.attendance_date BETWEEN p_start_date AND p_end_date
  ORDER BY a.attendance_date DESC;
END;
$$;

-- Funzione get_department_statistics_v2
CREATE OR REPLACE FUNCTION get_department_statistics_v2(
  p_department_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  status TEXT,
  count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica che l'utente sia un amministratore o un manager del dipartimento
  IF NOT check_admin_role() AND NOT (
    SELECT EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.department_id = p_department_id
        AND (SELECT (raw_app_meta_data->>'is_manager')::boolean FROM auth.users WHERE id = auth.uid())
    )
  ) THEN
    RAISE EXCEPTION 'Non hai i permessi per visualizzare le statistiche di questo dipartimento';
  END IF;
  
  -- Restituisci le statistiche del dipartimento
  RETURN QUERY
  SELECT a.status, COUNT(*) as count
  FROM attendance_v2 a
  JOIN employees e ON a.employee_id = e.user_id
  WHERE e.department_id = p_department_id
    AND a.attendance_date BETWEEN p_start_date AND p_end_date
  GROUP BY a.status
  ORDER BY count DESC;
END;
$$;

-- Funzione generate_monthly_report_v2
CREATE OR REPLACE FUNCTION generate_monthly_report_v2(
  p_year INT,
  p_month INT
)
RETURNS TABLE (
  department_name TEXT,
  employee_name TEXT,
  present_days BIGINT,
  absent_days BIGINT,
  leave_days BIGINT,
  working_days BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Verifica che l'utente sia un amministratore
  IF NOT check_admin_role() THEN
    RAISE EXCEPTION 'Solo gli amministratori possono generare report mensili';
  END IF;
  
  -- Calcola le date di inizio e fine del mese
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Restituisci il report mensile
  RETURN QUERY
  WITH working_days AS (
    SELECT COUNT(*) as days
    FROM generate_series(v_start_date, v_end_date, '1 day'::interval) as day
    WHERE is_working_day(day::date)
  )
  SELECT 
    d.name as department_name,
    (u.raw_user_meta_data->>'first_name' || ' ' || u.raw_user_meta_data->>'last_name') as employee_name,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days,
    (SELECT days FROM working_days) as working_days
  FROM employees e
  JOIN departments d ON e.department_id = d.id
  JOIN auth.users u ON e.user_id = u.id
  LEFT JOIN attendance_v2 a ON e.user_id = a.employee_id AND a.attendance_date BETWEEN v_start_date AND v_end_date
  GROUP BY d.name, employee_name, working_days
  ORDER BY d.name, employee_name;
END;
$$;

-- Funzione save_quiz_results
CREATE OR REPLACE FUNCTION save_quiz_results(
  p_quiz_id UUID,
  p_student_id UUID,
  p_student_email TEXT,
  p_score INT,
  p_max_score INT,
  p_answers JSONB
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result_id UUID;
BEGIN
  -- Inserisci i risultati del quiz
  INSERT INTO results (
    quiz_id, 
    student_id, 
    student_email, 
    score, 
    max_score, 
    answers, 
    completed_at
  )
  VALUES (
    p_quiz_id, 
    p_student_id, 
    p_student_email, 
    p_score, 
    p_max_score, 
    p_answers, 
    NOW()
  )
  RETURNING id INTO v_result_id;
  
  RETURN v_result_id;
END;
$$;

-- Funzione update_quiz_data
CREATE OR REPLACE FUNCTION update_quiz_data()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Funzione get_all_videos
CREATE OR REPLACE FUNCTION get_all_videos()
RETURNS TABLE (
  category_id UUID,
  category_title TEXT,
  category_description TEXT,
  category_created_at TIMESTAMPTZ,
  video_id UUID,
  video_title TEXT,
  video_description TEXT,
  video_url TEXT,
  video_thumbnail TEXT,
  video_duration INT,
  video_is_public BOOLEAN,
  video_created_at TIMESTAMPTZ,
  video_publish_date TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica che l'utente sia un amministratore o un istruttore
  IF NOT (
    SELECT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (role = 'admin' OR role = 'instructor')
    )
  ) THEN
    RAISE EXCEPTION 'Solo amministratori e istruttori possono accedere a tutti i video';
  END IF;

  RETURN QUERY
  SELECT 
    vc.id as category_id,
    vc.title as category_title,
    vc.description as category_description,
    vc.created_at as category_created_at,
    v.id as video_id,
    v.title as video_title,
    v.description as video_description,
    v.url as video_url,
    v.thumbnail as video_thumbnail,
    v.duration as video_duration,
    v.is_public as video_is_public,
    v.created_at as video_created_at,
    v.publish_date as video_publish_date
  FROM video_categories vc
  LEFT JOIN videos v ON v.category_id = vc.id
  ORDER BY v.publish_date DESC NULLS LAST, vc.title ASC;
END;
$$;

-- Funzione get_student_videos
CREATE OR REPLACE FUNCTION get_student_videos()
RETURNS TABLE (
  category_id UUID,
  category_title TEXT,
  category_description TEXT,
  category_created_at TIMESTAMPTZ,
  video_id UUID,
  video_title TEXT,
  video_description TEXT,
  video_url TEXT,
  video_thumbnail TEXT,
  video_duration INT,
  video_is_public BOOLEAN,
  video_created_at TIMESTAMPTZ,
  video_publish_date TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica che l'utente sia autenticato
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Devi essere autenticato per accedere ai video';
  END IF;

  RETURN QUERY
  SELECT 
    vc.id as category_id,
    vc.title as category_title,
    vc.description as category_description,
    vc.created_at as category_created_at,
    v.id as video_id,
    v.title as video_title,
    v.description as video_description,
    v.url as video_url,
    v.thumbnail as video_thumbnail,
    v.duration as video_duration,
    v.is_public as video_is_public,
    v.created_at as video_created_at,
    v.publish_date as video_publish_date
  FROM video_categories vc
  LEFT JOIN videos v ON v.category_id = vc.id
  WHERE v.is_public = true
  ORDER BY v.publish_date DESC NULLS LAST, vc.title ASC;
END;
$$;

-- Concedi i permessi di esecuzione per le funzioni
GRANT EXECUTE ON FUNCTION register_attendance_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION correct_attendance_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_attendance_summary_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_department_statistics_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION generate_monthly_report_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION save_quiz_results TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_videos TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_videos TO authenticated; 
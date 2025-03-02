-- Correzione del search_path per le funzioni aggiuntive

-- Funzione is_holiday
CREATE OR REPLACE FUNCTION is_holiday(check_date DATE)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM holidays WHERE holiday_date = check_date
  );
END;
$$;

-- Funzione is_weekend_holiday
CREATE OR REPLACE FUNCTION is_weekend_holiday(check_date DATE)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXTRACT(DOW FROM check_date) IN (0, 6) OR is_holiday(check_date);
END;
$$;

-- Funzione is_working_day
CREATE OR REPLACE FUNCTION is_working_day(check_date DATE)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NOT is_weekend_holiday(check_date);
END;
$$;

-- Funzione can_manage_holidays
CREATE OR REPLACE FUNCTION can_manage_holidays()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT (raw_app_meta_data->>'is_master')::boolean OR (raw_app_meta_data->>'is_admin')::boolean
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;

-- Funzione can_manage_attendance
CREATE OR REPLACE FUNCTION can_manage_attendance()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT (raw_app_meta_data->>'is_master')::boolean OR (raw_app_meta_data->>'is_admin')::boolean
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;

-- Funzione can_view_employee_data
CREATE OR REPLACE FUNCTION can_view_employee_data(employee_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Amministratori possono vedere tutti i dati
  IF (SELECT (raw_app_meta_data->>'is_master')::boolean OR (raw_app_meta_data->>'is_admin')::boolean
      FROM auth.users WHERE id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  
  -- Gli utenti possono vedere i propri dati
  IF employee_id = auth.uid() THEN
    RETURN TRUE;
  END IF;
  
  -- I manager possono vedere i dati dei dipendenti del loro dipartimento
  RETURN is_same_department(employee_id, auth.uid()) AND 
         (SELECT (raw_app_meta_data->>'is_manager')::boolean FROM auth.users WHERE id = auth.uid());
END;
$$;

-- Funzione is_same_department
CREATE OR REPLACE FUNCTION is_same_department(employee1_id UUID, employee2_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  dept1 UUID;
  dept2 UUID;
BEGIN
  SELECT department_id INTO dept1 FROM employees WHERE user_id = employee1_id;
  SELECT department_id INTO dept2 FROM employees WHERE user_id = employee2_id;
  
  RETURN dept1 = dept2 AND dept1 IS NOT NULL;
END;
$$;

-- Funzione update_employee_timestamp
CREATE OR REPLACE FUNCTION update_employee_timestamp()
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

-- Funzione check_admin_role
CREATE OR REPLACE FUNCTION check_admin_role()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT (raw_app_meta_data->>'is_master')::boolean OR (raw_app_meta_data->>'is_admin')::boolean
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;

-- Funzione update_live_quiz_session_timestamp
CREATE OR REPLACE FUNCTION update_live_quiz_session_timestamp()
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

-- Funzione is_quiz_host
CREATE OR REPLACE FUNCTION is_quiz_host(session_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM live_quiz_sessions
    WHERE id = session_id AND host_email = auth.email()
  );
END;
$$;

-- Funzione verify_student_login
CREATE OR REPLACE FUNCTION verify_student_login(student_email TEXT, pin_code TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM students
    WHERE email = student_email AND pin = pin_code
  );
END;
$$;

-- Funzione handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Inserisci il nuovo utente nella tabella dei profili
  INSERT INTO profiles (id, email, first_name, last_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$; 
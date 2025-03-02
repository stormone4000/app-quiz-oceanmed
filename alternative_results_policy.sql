-- OPZIONE 1: SE LA COLONNA È 'email'
-- Politica RLS che consente agli studenti di leggere solo i propri risultati
CREATE POLICY "Students can read only their own results (email)" 
ON public.results 
FOR SELECT 
TO authenticated 
USING (email = auth.email());

-- OPZIONE 2: SE LA COLONNA È 'user_email'
-- Politica RLS che consente agli studenti di leggere solo i propri risultati
CREATE POLICY "Students can read only their own results (user_email)" 
ON public.results 
FOR SELECT 
TO authenticated 
USING (user_email = auth.email());

-- OPZIONE 3: SE LA COLONNA È 'student_id' E È CONNESSA A auth.uid()
-- Politica RLS che consente agli studenti di leggere solo i propri risultati
CREATE POLICY "Students can read only their own results (student_id)" 
ON public.results 
FOR SELECT 
TO authenticated 
USING (student_id = auth.uid());

-- Politica generica di inserimento che va bene in tutti i casi
CREATE POLICY "Students can insert their own results" 
ON public.results 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- Politica generica per istruttori che va bene in tutti i casi
CREATE POLICY "Instructors can read results of their own quizzes" 
ON public.results 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM quiz_templates qt 
    WHERE qt.id = quiz_id 
    AND qt.created_by = auth.email()
  )
); 
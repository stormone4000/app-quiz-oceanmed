-- 1. Abilitare RLS sulla tabella results
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- 2. Politica che consente agli studenti di inserire i propri risultati
CREATE POLICY "Students can insert their own results" 
ON public.results 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Politica che consente agli studenti di leggere solo i propri risultati
CREATE POLICY "Students can read only their own results" 
ON public.results 
FOR SELECT 
TO authenticated 
USING (student_email = auth.email());

-- 4. Politica che consente agli istruttori di leggere i risultati dei quiz che hanno creato
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
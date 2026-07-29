
-- activity_ai_suggestions
DROP POLICY IF EXISTS "activity_ai_suggestions clinician read" ON public.activity_ai_suggestions;
CREATE POLICY "activity_ai_suggestions clinician read"
ON public.activity_ai_suggestions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_patient_access(auth.uid(), patient_id));

-- workout_logs
DROP POLICY IF EXISTS "workout_logs clinician read" ON public.workout_logs;
CREATE POLICY "workout_logs clinician read"
ON public.workout_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_patient_access(auth.uid(), patient_id));

-- workout_plans
DROP POLICY IF EXISTS "workout_plans clinician manage" ON public.workout_plans;
CREATE POLICY "workout_plans clinician manage"
ON public.workout_plans FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_patient_access(auth.uid(), patient_id))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_patient_access(auth.uid(), patient_id));

-- workout_sessions
DROP POLICY IF EXISTS "workout_sessions via plan" ON public.workout_sessions;
CREATE POLICY "workout_sessions via plan"
ON public.workout_sessions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workout_plans p
  WHERE p.id = workout_sessions.plan_id
    AND (p.patient_id = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR has_patient_access(auth.uid(), p.patient_id))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workout_plans p
  WHERE p.id = workout_sessions.plan_id
    AND (p.patient_id = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR has_patient_access(auth.uid(), p.patient_id))
));

-- workout_exercises
DROP POLICY IF EXISTS "workout_exercises via session" ON public.workout_exercises;
CREATE POLICY "workout_exercises via session"
ON public.workout_exercises FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.workout_sessions s
  JOIN public.workout_plans p ON p.id = s.plan_id
  WHERE s.id = workout_exercises.session_id
    AND (p.patient_id = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR has_patient_access(auth.uid(), p.patient_id))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workout_sessions s
  JOIN public.workout_plans p ON p.id = s.plan_id
  WHERE s.id = workout_exercises.session_id
    AND (p.patient_id = auth.uid()
         OR has_role(auth.uid(), 'admin'::app_role)
         OR has_patient_access(auth.uid(), p.patient_id))
));

-- nutricionista_profiles: stop exposing cedula to every authenticated user
DROP POLICY IF EXISTS "nut_select_all" ON public.nutricionista_profiles;
CREATE POLICY "nut_select_own_or_admin"
ON public.nutricionista_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

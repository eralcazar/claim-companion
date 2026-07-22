
-- Enum de objetivos
DO $$ BEGIN
  CREATE TYPE public.workout_objective AS ENUM ('perder_peso','tonificar','rehabilitacion','cardio','fuerza','mantenimiento','flexibilidad');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.workout_level AS ENUM ('principiante','intermedio','avanzado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- activity_goals
CREATE TABLE IF NOT EXISTS public.activity_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  steps_goal INT NOT NULL DEFAULT 8000,
  active_minutes_goal INT NOT NULL DEFAULT 30,
  sleep_minutes_goal INT NOT NULL DEFAULT 420,
  calories_goal INT NOT NULL DEFAULT 2000,
  resting_hr INT,
  max_hr INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_goals TO authenticated;
GRANT ALL ON public.activity_goals TO service_role;
ALTER TABLE public.activity_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_goals owner"
  ON public.activity_goals FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "activity_goals admin read"
  ON public.activity_goals FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- workout_plans
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  objective public.workout_objective NOT NULL DEFAULT 'mantenimiento',
  level public.workout_level NOT NULL DEFAULT 'principiante',
  days_per_week INT NOT NULL DEFAULT 3,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_plans owner all"
  ON public.workout_plans FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "workout_plans clinician manage"
  ON public.workout_plans FOR ALL
  USING (
    public.has_role(auth.uid(), 'medico')
    OR public.has_role(auth.uid(), 'nutricionista')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'medico')
    OR public.has_role(auth.uid(), 'nutricionista')
    OR public.has_role(auth.uid(), 'admin')
  );

-- workout_sessions
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  orden INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  duration_min INT,
  intensity TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_sessions via plan"
  ON public.workout_sessions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workout_plans p
    WHERE p.id = plan_id AND (
      p.patient_id = auth.uid()
      OR public.has_role(auth.uid(), 'medico')
      OR public.has_role(auth.uid(), 'nutricionista')
      OR public.has_role(auth.uid(), 'admin')
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_plans p
    WHERE p.id = plan_id AND (
      p.patient_id = auth.uid()
      OR public.has_role(auth.uid(), 'medico')
      OR public.has_role(auth.uid(), 'nutricionista')
      OR public.has_role(auth.uid(), 'admin')
    )
  ));

-- workout_exercises
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  orden INT NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  muscle_group TEXT,
  sets INT,
  reps INT,
  duration_seconds INT,
  rest_seconds INT,
  equipment TEXT,
  video_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_exercises TO authenticated;
GRANT ALL ON public.workout_exercises TO service_role;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_exercises via session"
  ON public.workout_exercises FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    JOIN public.workout_plans p ON p.id = s.plan_id
    WHERE s.id = session_id AND (
      p.patient_id = auth.uid()
      OR public.has_role(auth.uid(), 'medico')
      OR public.has_role(auth.uid(), 'nutricionista')
      OR public.has_role(auth.uid(), 'admin')
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workout_sessions s
    JOIN public.workout_plans p ON p.id = s.plan_id
    WHERE s.id = session_id AND (
      p.patient_id = auth.uid()
      OR public.has_role(auth.uid(), 'medico')
      OR public.has_role(auth.uid(), 'nutricionista')
      OR public.has_role(auth.uid(), 'admin')
    )
  ));

-- workout_logs
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT (now()::date),
  completed BOOLEAN NOT NULL DEFAULT false,
  rpe INT CHECK (rpe BETWEEN 1 AND 10),
  duration_min INT,
  hr_avg INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_logs TO authenticated;
GRANT ALL ON public.workout_logs TO service_role;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_logs owner"
  ON public.workout_logs FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "workout_logs clinician read"
  ON public.workout_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'medico')
    OR public.has_role(auth.uid(), 'nutricionista')
    OR public.has_role(auth.uid(), 'admin')
  );

-- activity_ai_suggestions
CREATE TABLE IF NOT EXISTS public.activity_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  red_flags JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  suggested_plan JSONB,
  model TEXT,
  tokens_used INT DEFAULT 0,
  applied_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_ai_suggestions TO authenticated;
GRANT ALL ON public.activity_ai_suggestions TO service_role;
ALTER TABLE public.activity_ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_ai_suggestions owner"
  ON public.activity_ai_suggestions FOR ALL
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "activity_ai_suggestions clinician read"
  ON public.activity_ai_suggestions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'medico')
    OR public.has_role(auth.uid(), 'nutricionista')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Triggers de updated_at
CREATE TRIGGER trg_activity_goals_updated BEFORE UPDATE ON public.activity_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workout_plans_updated BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workout_sessions_updated BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workout_exercises_updated BEFORE UPDATE ON public.workout_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_workout_logs_updated BEFORE UPDATE ON public.workout_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan ON public.workout_sessions(plan_id, day_of_week, orden);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_session ON public.workout_exercises(session_id, orden);
CREATE INDEX IF NOT EXISTS idx_workout_logs_patient_fecha ON public.workout_logs(patient_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_activity_ai_suggestions_patient ON public.activity_ai_suggestions(patient_id, created_at DESC);

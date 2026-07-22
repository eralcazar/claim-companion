ALTER TABLE public.exercise_session_logs
  ADD COLUMN IF NOT EXISTS warmup_notes text,
  ADD COLUMN IF NOT EXISTS discomforts text,
  ADD COLUMN IF NOT EXISTS session_rest_sec integer;

ALTER TABLE public.workout_plans
  ADD COLUMN IF NOT EXISTS weeks integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS progression_scheme text NOT NULL DEFAULT 'linear',
  ADD COLUMN IF NOT EXISTS current_week integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS equipment text[] NOT NULL DEFAULT '{}'::text[];

DO $$ BEGIN
  ALTER TABLE public.workout_plans
    ADD CONSTRAINT workout_plans_progression_scheme_check
    CHECK (progression_scheme IN ('linear','double_progression','undulating'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.workout_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text,
  rows_ok integer NOT NULL DEFAULT 0,
  rows_error integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_import_batches TO authenticated;
GRANT ALL ON public.workout_import_batches TO service_role;

ALTER TABLE public.workout_import_batches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own import batches" ON public.workout_import_batches
    FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.ai_provider_policy (feature_key, label, model, provider, enable_cache, cache_ttl_hours, max_input_tokens, max_output_tokens, history_window)
VALUES
  ('workout_plan_generate', 'Generación de plan de entrenamiento', 'google/gemini-3-flash-preview', 'lovable', false, 0, 4000, 2500, 0),
  ('workout_plan_adjust',   'Ajuste de plan de entrenamiento',    'google/gemini-3-flash-preview', 'lovable', false, 0, 4000, 2000, 0),
  ('exercise_session_summary', 'Resumen IA de sesión de entrenamiento', 'google/gemini-3-flash-preview', 'lovable', false, 0, 3000, 1200, 0)
ON CONFLICT (feature_key) DO NOTHING;
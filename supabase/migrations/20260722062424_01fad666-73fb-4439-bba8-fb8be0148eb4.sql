
CREATE TABLE IF NOT EXISTS public.patient_monitor_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monitor_type text NOT NULL,
  min_val numeric,
  max_val numeric,
  outlier_z numeric DEFAULT 2.5,
  min_readings_per_day integer DEFAULT 1,
  date_from date,
  date_to date,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pmt_patient_monitor ON public.patient_monitor_thresholds(patient_id, monitor_type, active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_monitor_thresholds TO authenticated;
GRANT ALL ON public.patient_monitor_thresholds TO service_role;
ALTER TABLE public.patient_monitor_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own thresholds select" ON public.patient_monitor_thresholds
  FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "own thresholds insert" ON public.patient_monitor_thresholds
  FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "own thresholds update" ON public.patient_monitor_thresholds
  FOR UPDATE TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());
CREATE POLICY "own thresholds delete" ON public.patient_monitor_thresholds
  FOR DELETE TO authenticated USING (patient_id = auth.uid());
CREATE TRIGGER trg_pmt_updated_at BEFORE UPDATE ON public.patient_monitor_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ai_nutrition_suggestions_saved (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  answer_text text NOT NULL,
  refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  provider text,
  model text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','follow','ignore')),
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ansug_patient ON public.ai_nutrition_suggestions_saved(patient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_nutrition_suggestions_saved TO authenticated;
GRANT ALL ON public.ai_nutrition_suggestions_saved TO service_role;
ALTER TABLE public.ai_nutrition_suggestions_saved ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai sugg select" ON public.ai_nutrition_suggestions_saved
  FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "own ai sugg insert" ON public.ai_nutrition_suggestions_saved
  FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "own ai sugg update" ON public.ai_nutrition_suggestions_saved
  FOR UPDATE TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());
CREATE POLICY "own ai sugg delete" ON public.ai_nutrition_suggestions_saved
  FOR DELETE TO authenticated USING (patient_id = auth.uid());
CREATE TRIGGER trg_ansug_updated_at BEFORE UPDATE ON public.ai_nutrition_suggestions_saved
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.recipe_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'medlineplus',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','error')),
  added_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_message text,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_rir_started ON public.recipe_import_runs(started_at DESC);
GRANT SELECT ON public.recipe_import_runs TO authenticated;
GRANT ALL ON public.recipe_import_runs TO service_role;
ALTER TABLE public.recipe_import_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read import runs" ON public.recipe_import_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.nutrition_recipes
  ADD COLUMN IF NOT EXISTS external_source text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_hash text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS uq_recipes_external ON public.nutrition_recipes(external_source, external_id) WHERE external_source IS NOT NULL;

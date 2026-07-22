
CREATE TABLE IF NOT EXISTS public.workout_plan_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  hour smallint NOT NULL CHECK (hour BETWEEN 0 AND 23),
  minute smallint NOT NULL DEFAULT 0 CHECK (minute BETWEEN 0 AND 59),
  minutes_before smallint NOT NULL DEFAULT 30,
  channels jsonb NOT NULL DEFAULT '{"in_app":true,"push":true,"gcal":false}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plan_reminders TO authenticated;
GRANT ALL ON public.workout_plan_reminders TO service_role;
ALTER TABLE public.workout_plan_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workout reminders" ON public.workout_plan_reminders
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE INDEX IF NOT EXISTS idx_wpr_patient ON public.workout_plan_reminders(patient_id, active);
CREATE TRIGGER trg_wpr_updated BEFORE UPDATE ON public.workout_plan_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.workout_sessions_scheduled (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL,
  scheduled_at timestamptz NOT NULL,
  target_type text NOT NULL DEFAULT 'workout',
  target_reference jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','skipped','adjusted')),
  session_log_id uuid REFERENCES public.exercise_session_logs(id) ON DELETE SET NULL,
  reminder_sent_at timestamptz,
  gcal_event_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions_scheduled TO authenticated;
GRANT ALL ON public.workout_sessions_scheduled TO service_role;
ALTER TABLE public.workout_sessions_scheduled ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scheduled sessions" ON public.workout_sessions_scheduled
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE INDEX IF NOT EXISTS idx_wss_patient_time ON public.workout_sessions_scheduled(patient_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_wss_pending ON public.workout_sessions_scheduled(scheduled_at) WHERE status = 'pending';
CREATE TRIGGER trg_wss_updated BEFORE UPDATE ON public.workout_sessions_scheduled
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workout_import_batches
  ADD COLUMN IF NOT EXISTS rows_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_ok integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rows_failed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS errors_json jsonb,
  ADD COLUMN IF NOT EXISTS column_map jsonb;

INSERT INTO public.ai_provider_policy (feature_key, label, model, provider, enable_cache, cache_ttl_hours, max_input_tokens, max_output_tokens, history_window)
VALUES
  ('workout_reminder_note','Recordatorio de entrenamiento','google/gemini-3-flash-preview','lovable',false,0,1500,400,0),
  ('progression_adjust','Ajuste automático de progresión','google/gemini-3-flash-preview','lovable',false,0,3000,800,0)
ON CONFLICT (feature_key) DO NOTHING;

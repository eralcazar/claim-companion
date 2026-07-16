
-- heart rate
CREATE TABLE public.heart_rate_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  bpm integer NOT NULL,
  measured_at timestamptz NOT NULL DEFAULT now(),
  context text,
  notes text,
  source text,
  device_name text,
  external_uuid text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.heart_rate_readings TO authenticated;
GRANT ALL ON public.heart_rate_readings TO service_role;
ALTER TABLE public.heart_rate_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_select" ON public.heart_rate_readings FOR SELECT TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "hr_insert" ON public.heart_rate_readings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "hr_update" ON public.heart_rate_readings FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "hr_delete" ON public.heart_rate_readings FOR DELETE TO authenticated
  USING (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_hr_updated BEFORE UPDATE ON public.heart_rate_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_hr_patient_time ON public.heart_rate_readings(patient_id, measured_at DESC);

-- activity
CREATE TABLE public.activity_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  fecha date NOT NULL,
  steps integer,
  active_minutes integer,
  calories integer,
  sleep_minutes integer,
  source text,
  device_name text,
  external_uuid text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, fecha, source)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_readings TO authenticated;
GRANT ALL ON public.activity_readings TO service_role;
ALTER TABLE public.activity_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "act_select" ON public.activity_readings FOR SELECT TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "act_insert" ON public.activity_readings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "act_update" ON public.activity_readings FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "act_delete" ON public.activity_readings FOR DELETE TO authenticated
  USING (auth.uid() = patient_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_act_updated BEFORE UPDATE ON public.activity_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_act_patient_fecha ON public.activity_readings(patient_id, fecha DESC);

-- add source columns to existing tables
ALTER TABLE public.spo2_readings ADD COLUMN IF NOT EXISTS source text, ADD COLUMN IF NOT EXISTS device_name text, ADD COLUMN IF NOT EXISTS external_uuid text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_spo2_external_uuid ON public.spo2_readings(external_uuid) WHERE external_uuid IS NOT NULL;

ALTER TABLE public.blood_pressure_readings ADD COLUMN IF NOT EXISTS source text, ADD COLUMN IF NOT EXISTS device_name text, ADD COLUMN IF NOT EXISTS external_uuid text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bp_external_uuid ON public.blood_pressure_readings(external_uuid) WHERE external_uuid IS NOT NULL;

ALTER TABLE public.glucose_readings ADD COLUMN IF NOT EXISTS source text, ADD COLUMN IF NOT EXISTS device_name text, ADD COLUMN IF NOT EXISTS external_uuid text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_glucose_external_uuid ON public.glucose_readings(external_uuid) WHERE external_uuid IS NOT NULL;

ALTER TABLE public.temperature_readings ADD COLUMN IF NOT EXISTS source text, ADD COLUMN IF NOT EXISTS device_name text, ADD COLUMN IF NOT EXISTS external_uuid text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_temp_external_uuid ON public.temperature_readings(external_uuid) WHERE external_uuid IS NOT NULL;

-- profiles last sync
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS health_last_synced_at timestamptz;

-- feature permissions
INSERT INTO public.role_permissions (role, feature_key, allowed) VALUES
  ('paciente'::app_role, 'health_devices', true),
  ('medico'::app_role,   'health_devices', true),
  ('enfermero'::app_role,'health_devices', true),
  ('admin'::app_role,    'health_devices', true)
ON CONFLICT DO NOTHING;

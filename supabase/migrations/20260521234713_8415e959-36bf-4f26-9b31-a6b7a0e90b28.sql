
-- temperature_readings
CREATE TABLE public.temperature_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  temperature_c numeric(4,2) NOT NULL,
  method text,
  context text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_temperature_readings_patient_taken ON public.temperature_readings(patient_id, taken_at DESC);
ALTER TABLE public.temperature_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Temp select via access" ON public.temperature_readings
FOR SELECT TO authenticated
USING (
  auth.uid() = patient_id
  OR auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_patient_access(auth.uid(), patient_id)
  OR (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = temperature_readings.patient_id))
);

CREATE POLICY "Temp insert by self or personnel" ON public.temperature_readings
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (auth.uid() = patient_id
       OR has_role(auth.uid(), 'admin'::app_role)
       OR has_patient_access(auth.uid(), patient_id))
);

CREATE POLICY "Temp update by creator or admin" ON public.temperature_readings
FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Temp delete by creator or admin" ON public.temperature_readings
FOR DELETE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_temperature_readings_updated_at
BEFORE UPDATE ON public.temperature_readings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- glucose_readings
CREATE TABLE public.glucose_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  glucose_mgdl integer NOT NULL,
  measurement_context text NOT NULL DEFAULT 'aleatoria',
  hours_since_meal numeric(4,1),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_glucose_readings_patient_taken ON public.glucose_readings(patient_id, taken_at DESC);
ALTER TABLE public.glucose_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gluc select via access" ON public.glucose_readings
FOR SELECT TO authenticated
USING (
  auth.uid() = patient_id
  OR auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_patient_access(auth.uid(), patient_id)
  OR (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = glucose_readings.patient_id))
);

CREATE POLICY "Gluc insert by self or personnel" ON public.glucose_readings
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (auth.uid() = patient_id
       OR has_role(auth.uid(), 'admin'::app_role)
       OR has_patient_access(auth.uid(), patient_id))
);

CREATE POLICY "Gluc update by creator or admin" ON public.glucose_readings
FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gluc delete by creator or admin" ON public.glucose_readings
FOR DELETE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_glucose_readings_updated_at
BEFORE UPDATE ON public.glucose_readings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

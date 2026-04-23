
-- Create blood_pressure_readings table
CREATE TABLE public.blood_pressure_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  systolic integer NOT NULL,
  diastolic integer NOT NULL,
  pulse integer,
  position text,
  arm text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bp_patient_taken ON public.blood_pressure_readings (patient_id, taken_at DESC);
CREATE INDEX idx_bp_created_by ON public.blood_pressure_readings (created_by);

-- Validation trigger (no CHECK constraints per project rule)
CREATE OR REPLACE FUNCTION public.validate_blood_pressure_reading()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.systolic IS NULL OR NEW.systolic < 50 OR NEW.systolic > 260 THEN
    RAISE EXCEPTION 'Sistólica fuera de rango (50-260): %', NEW.systolic;
  END IF;
  IF NEW.diastolic IS NULL OR NEW.diastolic < 30 OR NEW.diastolic > 200 THEN
    RAISE EXCEPTION 'Diastólica fuera de rango (30-200): %', NEW.diastolic;
  END IF;
  IF NEW.systolic <= NEW.diastolic THEN
    RAISE EXCEPTION 'La sistólica (%) debe ser mayor que la diastólica (%)', NEW.systolic, NEW.diastolic;
  END IF;
  IF NEW.pulse IS NOT NULL AND (NEW.pulse < 20 OR NEW.pulse > 250) THEN
    RAISE EXCEPTION 'Pulso fuera de rango (20-250): %', NEW.pulse;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_bp_before_insert
BEFORE INSERT ON public.blood_pressure_readings
FOR EACH ROW EXECUTE FUNCTION public.validate_blood_pressure_reading();

CREATE TRIGGER validate_bp_before_update
BEFORE UPDATE ON public.blood_pressure_readings
FOR EACH ROW EXECUTE FUNCTION public.validate_blood_pressure_reading();

CREATE TRIGGER bp_set_updated_at
BEFORE UPDATE ON public.blood_pressure_readings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.blood_pressure_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BP select via access"
ON public.blood_pressure_readings
FOR SELECT
TO authenticated
USING (
  auth.uid() = patient_id
  OR auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_patient_access(auth.uid(), patient_id)
);

CREATE POLICY "BP insert by self or personnel"
ON public.blood_pressure_readings
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    auth.uid() = patient_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_patient_access(auth.uid(), patient_id)
  )
);

CREATE POLICY "BP update by creator or admin"
ON public.blood_pressure_readings
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "BP delete by creator or admin"
ON public.blood_pressure_readings
FOR DELETE
TO authenticated
USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'::app_role));

-- Seed permissions for new feature
INSERT INTO public.role_permissions (role, feature_key, allowed)
VALUES
  ('paciente', 'presion_arterial', true),
  ('medico', 'presion_arterial', true),
  ('enfermero', 'presion_arterial', true),
  ('broker', 'presion_arterial', true),
  ('admin', 'presion_arterial', true)
ON CONFLICT (role, feature_key) DO UPDATE SET allowed = EXCLUDED.allowed;

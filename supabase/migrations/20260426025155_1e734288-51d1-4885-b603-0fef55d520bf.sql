-- 1. Tabla
CREATE TABLE public.spo2_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  spo2 integer NOT NULL,
  pulse integer,
  context text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_spo2_readings_patient_taken ON public.spo2_readings (patient_id, taken_at DESC);

-- 2. RLS
ALTER TABLE public.spo2_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SpO2 select via access"
ON public.spo2_readings
FOR SELECT
TO authenticated
USING (
  auth.uid() = patient_id
  OR auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_patient_access(auth.uid(), patient_id)
);

CREATE POLICY "SpO2 insert by self or personnel"
ON public.spo2_readings
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

CREATE POLICY "SpO2 update by creator or admin"
ON public.spo2_readings
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "SpO2 delete by creator or admin"
ON public.spo2_readings
FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Trigger de validación
CREATE OR REPLACE FUNCTION public.validate_spo2_reading()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.spo2 IS NULL OR NEW.spo2 < 50 OR NEW.spo2 > 100 THEN
    RAISE EXCEPTION 'SpO2 fuera de rango (50-100): %', NEW.spo2;
  END IF;
  IF NEW.pulse IS NOT NULL AND (NEW.pulse < 20 OR NEW.pulse > 250) THEN
    RAISE EXCEPTION 'Pulso fuera de rango (20-250): %', NEW.pulse;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_spo2_reading
BEFORE INSERT OR UPDATE ON public.spo2_readings
FOR EACH ROW
EXECUTE FUNCTION public.validate_spo2_reading();

-- 4. Trigger de updated_at
CREATE TRIGGER trg_spo2_readings_updated_at
BEFORE UPDATE ON public.spo2_readings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
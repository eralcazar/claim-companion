-- Recordatorios programados de presión arterial
CREATE TABLE public.bp_reminder_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  -- modo: 'interval' (cada N horas), 'daily_times' (horarios fijos diarios), 'weekly' (días+horarios)
  mode text NOT NULL CHECK (mode IN ('interval','daily_times','weekly')),
  -- interval mode
  interval_hours integer,
  -- daily_times / weekly: lista de "HH:MM" en zona local del paciente
  daily_times text[] DEFAULT '{}'::text[],
  -- weekly mode: 0=domingo .. 6=sábado
  weekdays smallint[] DEFAULT '{}'::smallint[],
  timezone text NOT NULL DEFAULT 'America/Mexico_City',
  label text,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bp_reminders_patient ON public.bp_reminder_schedules(patient_id);
CREATE INDEX idx_bp_reminders_due ON public.bp_reminder_schedules(active, next_run_at) WHERE active = true;

-- Validación por trigger
CREATE OR REPLACE FUNCTION public.validate_bp_reminder()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.mode = 'interval' THEN
    IF NEW.interval_hours IS NULL OR NEW.interval_hours < 1 OR NEW.interval_hours > 168 THEN
      RAISE EXCEPTION 'interval_hours debe estar entre 1 y 168';
    END IF;
  ELSIF NEW.mode = 'daily_times' THEN
    IF NEW.daily_times IS NULL OR array_length(NEW.daily_times, 1) IS NULL THEN
      RAISE EXCEPTION 'daily_times requiere al menos un horario';
    END IF;
  ELSIF NEW.mode = 'weekly' THEN
    IF NEW.daily_times IS NULL OR array_length(NEW.daily_times, 1) IS NULL THEN
      RAISE EXCEPTION 'weekly requiere al menos un horario';
    END IF;
    IF NEW.weekdays IS NULL OR array_length(NEW.weekdays, 1) IS NULL THEN
      RAISE EXCEPTION 'weekly requiere al menos un día';
    END IF;
  END IF;
  IF NEW.ends_at IS NOT NULL AND NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'ends_at debe ser posterior a starts_at';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER bp_reminders_validate
BEFORE INSERT OR UPDATE ON public.bp_reminder_schedules
FOR EACH ROW EXECUTE FUNCTION public.validate_bp_reminder();

-- RLS
ALTER TABLE public.bp_reminder_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BPRem select via access"
ON public.bp_reminder_schedules FOR SELECT TO authenticated
USING (
  auth.uid() = patient_id
  OR auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_patient_access(auth.uid(), patient_id)
);

CREATE POLICY "BPRem insert by self or personnel"
ON public.bp_reminder_schedules FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    auth.uid() = patient_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_patient_access(auth.uid(), patient_id)
  )
);

CREATE POLICY "BPRem update by creator patient or admin"
ON public.bp_reminder_schedules FOR UPDATE TO authenticated
USING (
  auth.uid() = created_by
  OR auth.uid() = patient_id
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = created_by
  OR auth.uid() = patient_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "BPRem delete by creator patient or admin"
ON public.bp_reminder_schedules FOR DELETE TO authenticated
USING (
  auth.uid() = created_by
  OR auth.uid() = patient_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

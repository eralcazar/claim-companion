-- 1. Extensiones para cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Extender enum medication_frequency
ALTER TYPE public.medication_frequency ADD VALUE IF NOT EXISTS 'cada_4_horas';
ALTER TYPE public.medication_frequency ADD VALUE IF NOT EXISTS 'cada_6_horas';
ALTER TYPE public.medication_frequency ADD VALUE IF NOT EXISTS 'cada_48_horas';
ALTER TYPE public.medication_frequency ADD VALUE IF NOT EXISTS 'personalizado';

-- 3. Columnas nuevas en medications
ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS frequency_hours numeric,
  ADD COLUMN IF NOT EXISTS receta_item_id uuid;

CREATE INDEX IF NOT EXISTS idx_medications_receta_item ON public.medications(receta_item_id);

-- 4. Tabla medication_schedule
CREATE TABLE IF NOT EXISTS public.medication_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  receta_item_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  next_dose_at timestamptz NOT NULL,
  interval_hours numeric NOT NULL,
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  last_dose_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_schedule_active_next ON public.medication_schedule(active, next_dose_at);
CREATE INDEX IF NOT EXISTS idx_medication_schedule_user ON public.medication_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_schedule_receta_item ON public.medication_schedule(receta_item_id);

-- 5. RLS
ALTER TABLE public.medication_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own schedule"
ON public.medication_schedule FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.has_role(auth.uid(), 'medico'::app_role) AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.user_id = medication_schedule.user_id AND a.doctor_id = auth.uid()
  ))
  OR (public.has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
    SELECT 1 FROM public.broker_patients bp
    WHERE bp.broker_id = auth.uid() AND bp.patient_id = medication_schedule.user_id
  ))
);

CREATE POLICY "Users insert own schedule"
ON public.medication_schedule FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (public.has_role(auth.uid(), 'medico'::app_role) AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.user_id = medication_schedule.user_id AND a.doctor_id = auth.uid()
  ))
);

CREATE POLICY "Users update own schedule"
ON public.medication_schedule FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users delete own schedule"
ON public.medication_schedule FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Trigger updated_at
CREATE TRIGGER update_medication_schedule_updated_at
BEFORE UPDATE ON public.medication_schedule
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
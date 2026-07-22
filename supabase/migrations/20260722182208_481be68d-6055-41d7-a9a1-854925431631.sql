
-- 1. Nuevas columnas en home_visit_requests
ALTER TABLE public.home_visit_requests
  ADD COLUMN IF NOT EXISTS accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS location_source text,
  ADD COLUMN IF NOT EXISTS in_coverage boolean,
  ADD COLUMN IF NOT EXISTS requested_doctor_id uuid,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- 2. Tabla coverage_areas
CREATE TABLE IF NOT EXISTS public.coverage_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  nombre text NOT NULL,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  radius_m integer NOT NULL CHECK (radius_m > 0),
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coverage_areas TO authenticated;
GRANT ALL ON public.coverage_areas TO service_role;

ALTER TABLE public.coverage_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coverage_areas_read_all_authenticated"
  ON public.coverage_areas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "coverage_areas_owner_insert"
  ON public.coverage_areas FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "coverage_areas_owner_update"
  ON public.coverage_areas FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "coverage_areas_owner_delete"
  ON public.coverage_areas FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS coverage_areas_updated ON public.coverage_areas;
CREATE TRIGGER coverage_areas_updated
  BEFORE UPDATE ON public.coverage_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Notificar al crear una solicitud
CREATE OR REPLACE FUNCTION public.notify_home_visit_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text := 'Nueva solicitud a domicilio';
  v_body text := COALESCE(NEW.motivo, 'Solicitud sin motivo') ||
                 ' · urgencia: ' || COALESCE(NEW.urgencia, 'media');
BEGIN
  IF NEW.requested_doctor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
    VALUES (NEW.requested_doctor_id, v_title, v_body, 'home_visit',
            '/domicilio', 'home_visit_created:' || NEW.id);
  ELSE
    INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
    SELECT DISTINCT ur.user_id, v_title, v_body, 'home_visit', '/domicilio',
           'home_visit_created:' || NEW.id
    FROM public.user_roles ur
    WHERE ur.role IN ('medico', 'admin');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_home_visit_created ON public.home_visit_requests;
CREATE TRIGGER trg_home_visit_created
  AFTER INSERT ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_home_visit_created();

-- 4. Notificar al paciente cuando se acepta
CREATE OR REPLACE FUNCTION public.notify_home_visit_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = 'aceptada' AND COALESCE(OLD.estado, '') <> 'aceptada' THEN
    IF NEW.accepted_at IS NULL THEN NEW.accepted_at := now(); END IF;
    IF NEW.doctor_id IS NULL THEN NEW.doctor_id := auth.uid(); END IF;

    INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
    VALUES (NEW.patient_id,
            'Tu solicitud a domicilio fue aceptada',
            'Un profesional aceptó tu solicitud. Te contactará pronto.',
            'home_visit', '/domicilio',
            'home_visit_accepted:' || NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_home_visit_accepted ON public.home_visit_requests;
CREATE TRIGGER trg_home_visit_accepted
  BEFORE UPDATE ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_home_visit_accepted();


-- 1. Columnas nuevas en home_visit_requests
ALTER TABLE public.home_visit_requests
  ADD COLUMN IF NOT EXISTS motivo_rechazo text,
  ADD COLUMN IF NOT EXISTS rechazado_at timestamptz,
  ADD COLUMN IF NOT EXISTS en_camino_at timestamptz,
  ADD COLUMN IF NOT EXISTS llegado_at timestamptz;

-- 2. Timeline
CREATE TABLE IF NOT EXISTS public.home_visit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES public.home_visit_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  event text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_visit_events TO authenticated;
GRANT ALL ON public.home_visit_events TO service_role;

ALTER TABLE public.home_visit_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS home_visit_events_visit_idx
  ON public.home_visit_events(visit_id, created_at);

DROP POLICY IF EXISTS "hve_select" ON public.home_visit_events;
CREATE POLICY "hve_select" ON public.home_visit_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.home_visit_requests r
      WHERE r.id = home_visit_events.visit_id
        AND (
          auth.uid() = r.requested_by
          OR auth.uid() = r.patient_id
          OR auth.uid() = r.doctor_id
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- 3. Función que registra eventos
CREATE OR REPLACE FUNCTION public.log_home_visit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_event text;
  v_meta jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.home_visit_events(visit_id, actor_id, event, metadata)
    VALUES (NEW.id, COALESCE(v_actor, NEW.requested_by), 'created',
            jsonb_build_object('urgencia', NEW.urgencia, 'motivo', NEW.motivo));
    RETURN NEW;
  END IF;

  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    v_event := CASE NEW.estado
      WHEN 'aceptada'   THEN 'accepted'
      WHEN 'rechazada'  THEN 'rejected'
      WHEN 'en_camino'  THEN 'en_route'
      WHEN 'llegada'    THEN 'arrived'
      WHEN 'completada' THEN 'completed'
      WHEN 'cancelada'  THEN 'cancelled'
      ELSE 'updated'
    END;
    IF NEW.estado = 'rechazada' AND NEW.motivo_rechazo IS NOT NULL THEN
      v_meta := jsonb_build_object('motivo_rechazo', NEW.motivo_rechazo);
    END IF;
    INSERT INTO public.home_visit_events(visit_id, actor_id, event, metadata)
    VALUES (NEW.id, v_actor, v_event, v_meta);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_home_visit_event_ins ON public.home_visit_requests;
CREATE TRIGGER trg_home_visit_event_ins
  AFTER INSERT ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_home_visit_event();

DROP TRIGGER IF EXISTS trg_home_visit_event_upd ON public.home_visit_requests;
CREATE TRIGGER trg_home_visit_event_upd
  AFTER UPDATE OF estado ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_home_visit_event();

-- 4. Trigger BEFORE UPDATE: fija timestamps y valida transiciones sensibles
CREATE OR REPLACE FUNCTION public.home_visit_state_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'en_camino' AND NEW.en_camino_at IS NULL THEN
      NEW.en_camino_at := now();
    END IF;
    IF NEW.estado = 'llegada' AND NEW.llegado_at IS NULL THEN
      NEW.llegado_at := now();
    END IF;
    IF NEW.estado = 'rechazada' AND NEW.rechazado_at IS NULL THEN
      NEW.rechazado_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_home_visit_state_transitions ON public.home_visit_requests;
CREATE TRIGGER trg_home_visit_state_transitions
  BEFORE UPDATE ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.home_visit_state_transitions();

-- 5. Ampliar notificaciones al paciente en cambios de estado
CREATE OR REPLACE FUNCTION public.notify_home_visit_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado = 'aceptada' THEN
      IF NEW.accepted_at IS NULL THEN NEW.accepted_at := now(); END IF;
      IF NEW.doctor_id IS NULL THEN NEW.doctor_id := auth.uid(); END IF;
      INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
      VALUES (NEW.patient_id,
              'Tu solicitud a domicilio fue aceptada',
              'Un profesional aceptó tu solicitud. Te contactará pronto.',
              'home_visit', '/domicilio',
              'home_visit_accepted:' || NEW.id)
      ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

    ELSIF NEW.estado = 'rechazada' THEN
      INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
      VALUES (NEW.patient_id,
              '❌ Solicitud rechazada',
              COALESCE('Motivo: ' || NEW.motivo_rechazo, 'Tu solicitud a domicilio fue rechazada.'),
              'home_visit', '/domicilio',
              'home_visit_rejected:' || NEW.id)
      ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

    ELSIF NEW.estado = 'en_camino' THEN
      INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
      VALUES (NEW.patient_id,
              '🚗 Tu médico va en camino',
              'El profesional se dirige a tu domicilio.',
              'home_visit', '/domicilio',
              'home_visit_en_route:' || NEW.id)
      ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

    ELSIF NEW.estado = 'llegada' THEN
      INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
      VALUES (NEW.patient_id,
              '📍 Tu médico llegó',
              'El profesional acaba de llegar a tu domicilio.',
              'home_visit', '/domicilio',
              'home_visit_arrived:' || NEW.id)
      ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

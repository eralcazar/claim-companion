
ALTER TABLE public.home_visit_requests
  ADD COLUMN IF NOT EXISTS reschedule_status text,
  ADD COLUMN IF NOT EXISTS reschedule_proposed_by uuid,
  ADD COLUMN IF NOT EXISTS reschedule_proposals timestamptz[],
  ADD COLUMN IF NOT EXISTS reschedule_note text,
  ADD COLUMN IF NOT EXISTS reschedule_requested_at timestamptz;

-- Extend event logger to capture reschedule actions
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

  -- Reschedule lifecycle
  IF NEW.reschedule_status IS DISTINCT FROM OLD.reschedule_status THEN
    IF NEW.reschedule_status = 'pending' THEN
      INSERT INTO public.home_visit_events(visit_id, actor_id, event, metadata)
      VALUES (NEW.id, v_actor, 'reschedule_proposed',
              jsonb_build_object(
                'proposals', to_jsonb(NEW.reschedule_proposals),
                'note', NEW.reschedule_note,
                'proposed_by', NEW.reschedule_proposed_by
              ));
    ELSIF NEW.reschedule_status = 'accepted' THEN
      INSERT INTO public.home_visit_events(visit_id, actor_id, event, metadata)
      VALUES (NEW.id, v_actor, 'reschedule_accepted',
              jsonb_build_object('fecha_preferida', NEW.fecha_preferida));
    ELSIF NEW.reschedule_status = 'rejected' THEN
      INSERT INTO public.home_visit_events(visit_id, actor_id, event, metadata)
      VALUES (NEW.id, v_actor, 'reschedule_rejected', '{}'::jsonb);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate update trigger to fire on reschedule column changes too
DROP TRIGGER IF EXISTS trg_home_visit_event_upd ON public.home_visit_requests;
CREATE TRIGGER trg_home_visit_event_upd
  AFTER UPDATE ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_home_visit_event();

-- Notification trigger for reschedule
CREATE OR REPLACE FUNCTION public.notify_home_visit_reschedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_target uuid;
  v_proposer uuid;
BEGIN
  IF NEW.reschedule_status IS DISTINCT FROM OLD.reschedule_status THEN
    v_proposer := NEW.reschedule_proposed_by;

    IF NEW.reschedule_status = 'pending' THEN
      -- Notify the counterpart
      IF v_proposer = NEW.patient_id THEN
        v_target := NEW.doctor_id;
      ELSE
        v_target := NEW.patient_id;
      END IF;
      IF v_target IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
        VALUES (v_target,
                '🗓️ Propuesta de reprogramación',
                COALESCE('Nota: ' || NEW.reschedule_note, 'Se propusieron nuevas opciones de fecha/hora para la visita.'),
                'home_visit', '/domicilio',
                'home_visit_reschedule_proposed:' || NEW.id || ':' || extract(epoch from now())::text)
        ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
      END IF;

    ELSIF NEW.reschedule_status IN ('accepted', 'rejected') THEN
      -- Notify the proposer of the outcome
      IF v_proposer IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
        VALUES (v_proposer,
                CASE WHEN NEW.reschedule_status = 'accepted'
                     THEN '✅ Reprogramación aceptada'
                     ELSE '❌ Reprogramación rechazada' END,
                CASE WHEN NEW.reschedule_status = 'accepted'
                     THEN 'La nueva fecha/hora fue aceptada.'
                     ELSE 'La propuesta de reprogramación fue rechazada.' END,
                'home_visit', '/domicilio',
                'home_visit_reschedule_' || NEW.reschedule_status || ':' || NEW.id || ':' || extract(epoch from now())::text)
        ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_home_visit_reschedule_notify ON public.home_visit_requests;
CREATE TRIGGER trg_home_visit_reschedule_notify
  AFTER UPDATE ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_home_visit_reschedule();


CREATE OR REPLACE FUNCTION public.notify_home_visit_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado = 'cancelada' AND NEW.doctor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
    VALUES (NEW.doctor_id,
            '🚫 Solicitud cancelada',
            'El paciente canceló la visita a domicilio.',
            'home_visit', '/domicilio',
            'home_visit_cancelled:' || NEW.id)
    ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_home_visit_cancel_notify ON public.home_visit_requests;
CREATE TRIGGER trg_home_visit_cancel_notify
  AFTER UPDATE ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_home_visit_cancelled();

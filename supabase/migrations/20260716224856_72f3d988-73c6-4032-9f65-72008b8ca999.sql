
-- 1) Notifications: add dedupe + push sync state + category
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS event_key text,
  ADD COLUMN IF NOT EXISTS push_sent_at timestamptz;

-- Unique dedup per user; NULLs allowed for legacy rows
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_key_uidx
  ON public.notifications (user_id, event_key)
  WHERE event_key IS NOT NULL;

-- 2) Drop the previous "requires_review flipped" trigger on clinical tables;
--    notifications will be driven by reading_reviews for exact events.
DROP TRIGGER IF EXISTS trg_notify_on_reading_review ON public.blood_pressure_readings;
DROP TRIGGER IF EXISTS trg_notify_on_reading_review ON public.spo2_readings;
DROP TRIGGER IF EXISTS trg_notify_on_reading_review ON public.temperature_readings;
DROP TRIGGER IF EXISTS trg_notify_on_reading_review ON public.activity_readings;

-- 3) New notifier: fires on inserts to reading_reviews with the exact event.
CREATE OR REPLACE FUNCTION public.notify_on_reading_review_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
  v_category text;
  v_event text;
BEGIN
  IF NEW.action = 'discard' THEN
    v_title := 'Lectura rechazada';
    v_body := 'Una lectura fue rechazada por el revisor.';
    v_category := 'pending_validated';
    v_event := 'review-discard-' || NEW.reading_kind || '-' || NEW.reading_id;
  ELSIF NEW.action = 'validate' AND NEW.notes IS NOT NULL AND length(trim(NEW.notes)) > 0 THEN
    v_title := 'Lectura mitigada';
    v_body := 'Una lectura fue revisada y mitigada con nota clínica.';
    v_category := 'clinical_alerts';
    v_event := 'review-mitigate-' || NEW.reading_kind || '-' || NEW.reading_id;
  ELSE
    v_title := 'Lectura validada';
    v_body := 'Una lectura pendiente fue validada por el revisor.';
    v_category := 'pending_validated';
    v_event := 'review-validate-' || NEW.reading_kind || '-' || NEW.reading_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, link, category, event_key)
  VALUES (NEW.patient_id, v_title, v_body, '/expediente', v_category, v_event)
  ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_reading_review_event ON public.reading_reviews;
CREATE TRIGGER trg_notify_on_reading_review_event
AFTER INSERT ON public.reading_reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_on_reading_review_event();

-- 4) Tag existing medical-alert notifier with a stable category + event_key
CREATE OR REPLACE FUNCTION public.notify_on_medical_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link, category, event_key)
  VALUES (
    NEW.patient_id,
    'Nueva alerta clínica',
    COALESCE(NEW.title, 'Se registró una nueva alerta médica en tu expediente.'),
    '/expediente',
    'clinical_alerts',
    'alert-' || NEW.id
  )
  ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5) RPC to mark a notification as pushed (sincronizado). Only owner can flip.
CREATE OR REPLACE FUNCTION public.mark_notification_pushed(_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.notifications WHERE id = _notification_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RETURN false;
  END IF;
  UPDATE public.notifications
    SET push_sent_at = COALESCE(push_sent_at, now())
    WHERE id = _notification_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_pushed(uuid) TO authenticated;

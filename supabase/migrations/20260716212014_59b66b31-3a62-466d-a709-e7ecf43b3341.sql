
-- 1) Review columns on SpO2, Temperature, Activity
ALTER TABLE public.spo2_readings
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS review_notes text;

ALTER TABLE public.temperature_readings
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS review_notes text;

ALTER TABLE public.activity_readings
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS review_notes text;

ALTER TABLE public.blood_pressure_readings
  ADD COLUMN IF NOT EXISTS review_notes text;

-- 2) Extend ble_known_devices with brand/model/type/verified/blocked
ALTER TABLE public.ble_known_devices
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS measurement_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Admin write policies (SELECT is already open per existing seed usage)
DROP POLICY IF EXISTS "Admins manage ble known devices" ON public.ble_known_devices;
CREATE POLICY "Admins manage ble known devices"
  ON public.ble_known_devices
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_ble_known_devices_updated_at ON public.ble_known_devices;
CREATE TRIGGER trg_ble_known_devices_updated_at
  BEFORE UPDATE ON public.ble_known_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) user_push_tokens
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_push_tokens TO authenticated;
GRANT ALL ON public.user_push_tokens TO service_role;
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
  ON public.user_push_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_user_push_tokens_updated_at ON public.user_push_tokens;
CREATE TRIGGER trg_user_push_tokens_updated_at
  BEFORE UPDATE ON public.user_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Notify on review approval
CREATE OR REPLACE FUNCTION public.notify_on_reading_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
  v_link text;
BEGIN
  IF OLD.requires_review = true AND NEW.requires_review = false THEN
    IF TG_TABLE_NAME = 'blood_pressure_readings' THEN
      v_title := 'Lectura de presión validada';
      v_body  := 'Tu lectura de ' || NEW.systolic || '/' || NEW.diastolic || ' mmHg fue revisada.';
      v_link  := '/expediente';
    ELSIF TG_TABLE_NAME = 'spo2_readings' THEN
      v_title := 'Lectura de SpO₂ validada';
      v_body  := 'Tu saturación de ' || NEW.spo2 || '% fue revisada.';
      v_link  := '/expediente';
    ELSIF TG_TABLE_NAME = 'temperature_readings' THEN
      v_title := 'Lectura de temperatura validada';
      v_body  := 'Tu temperatura de ' || NEW.temperature_c || '°C fue revisada.';
      v_link  := '/expediente';
    ELSIF TG_TABLE_NAME = 'activity_readings' THEN
      v_title := 'Lectura de actividad validada';
      v_body  := 'Tus datos de actividad del ' || NEW.fecha || ' fueron revisados.';
      v_link  := '/expediente';
    END IF;

    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (NEW.patient_id, v_title, v_body, v_link);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_bp_review ON public.blood_pressure_readings;
CREATE TRIGGER trg_notify_bp_review AFTER UPDATE ON public.blood_pressure_readings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reading_review();

DROP TRIGGER IF EXISTS trg_notify_spo2_review ON public.spo2_readings;
CREATE TRIGGER trg_notify_spo2_review AFTER UPDATE ON public.spo2_readings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reading_review();

DROP TRIGGER IF EXISTS trg_notify_temp_review ON public.temperature_readings;
CREATE TRIGGER trg_notify_temp_review AFTER UPDATE ON public.temperature_readings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reading_review();

DROP TRIGGER IF EXISTS trg_notify_activity_review ON public.activity_readings;
CREATE TRIGGER trg_notify_activity_review AFTER UPDATE ON public.activity_readings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reading_review();

-- 5) Notify on medical alert
CREATE OR REPLACE FUNCTION public.notify_on_medical_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (
    NEW.patient_id,
    'Nueva alerta clínica',
    COALESCE(NEW.title, 'Se registró una nueva alerta médica en tu expediente.'),
    '/expediente'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_medical_alert ON public.medical_alerts;
CREATE TRIGGER trg_notify_medical_alert AFTER INSERT ON public.medical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_medical_alert();

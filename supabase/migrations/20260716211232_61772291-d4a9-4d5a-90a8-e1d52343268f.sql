
-- user_ble_devices
CREATE TABLE public.user_ble_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  name text,
  service_uuid text,
  is_whitelisted boolean NOT NULL DEFAULT false,
  last_connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ble_devices TO authenticated;
GRANT ALL ON public.user_ble_devices TO service_role;
ALTER TABLE public.user_ble_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ble devices" ON public.user_ble_devices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_ble_devices_updated BEFORE UPDATE ON public.user_ble_devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ble_known_devices
CREATE TABLE public.ble_known_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_pattern text NOT NULL,
  vendor text,
  service_uuid text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ble_known_devices TO authenticated;
GRANT ALL ON public.ble_known_devices TO service_role;
ALTER TABLE public.ble_known_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read known devices" ON public.ble_known_devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage known devices" ON public.ble_known_devices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Semillas
INSERT INTO public.ble_known_devices (name_pattern, vendor, service_uuid, notes) VALUES
  ('Omron%', 'Omron', '00001810-0000-1000-8000-00805f9b34fb', 'Tensiómetro estándar GATT BP'),
  ('BLEsmart%', 'Omron', '00001810-0000-1000-8000-00805f9b34fb', 'Serie BLEsmart'),
  ('A&D UA%', 'A&D Medical', '00001810-0000-1000-8000-00805f9b34fb', 'Tensiómetro'),
  ('Wellue%', 'Wellue', '00001822-0000-1000-8000-00805f9b34fb', 'Oxímetro PLX'),
  ('O2Ring%', 'Wellue', '00001822-0000-1000-8000-00805f9b34fb', 'Oxímetro anillo'),
  ('Nonin%', 'Nonin', '00001822-0000-1000-8000-00805f9b34fb', 'Oxímetro clínico');

-- Revisión clínica
ALTER TABLE public.blood_pressure_readings
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

ALTER TABLE public.glucose_readings
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);


-- patient_ble_pairings
CREATE TABLE public.patient_ble_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  external_uuid text NOT NULL,
  device_name text,
  model text,
  service_type text NOT NULL,
  paired_at timestamptz NOT NULL DEFAULT now(),
  last_connected_at timestamptz,
  last_status text,
  last_error text,
  last_error_at timestamptz,
  unpaired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, external_uuid)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_ble_pairings TO authenticated;
GRANT ALL ON public.patient_ble_pairings TO service_role;

ALTER TABLE public.patient_ble_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pairings viewable by patient access"
  ON public.patient_ble_pairings FOR SELECT
  TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));

CREATE POLICY "Pairings insert by patient access"
  ON public.patient_ble_pairings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_patient_access(auth.uid(), patient_id));

CREATE POLICY "Pairings update by patient access"
  ON public.patient_ble_pairings FOR UPDATE
  TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id))
  WITH CHECK (public.has_patient_access(auth.uid(), patient_id));

CREATE POLICY "Pairings delete by patient access"
  ON public.patient_ble_pairings FOR DELETE
  TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));

CREATE TRIGGER update_patient_ble_pairings_updated_at
  BEFORE UPDATE ON public.patient_ble_pairings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ble_connection_errors
CREATE TABLE public.ble_connection_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  external_uuid text,
  service_type text,
  error_code text,
  error_message text NOT NULL,
  browser_ua text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.ble_connection_errors TO authenticated;
GRANT ALL ON public.ble_connection_errors TO service_role;

ALTER TABLE public.ble_connection_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BLE errors viewable by patient access"
  ON public.ble_connection_errors FOR SELECT
  TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));

CREATE POLICY "BLE errors insert by patient access"
  ON public.ble_connection_errors FOR INSERT
  TO authenticated
  WITH CHECK (public.has_patient_access(auth.uid(), patient_id));

CREATE POLICY "BLE errors delete by patient access"
  ON public.ble_connection_errors FOR DELETE
  TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));

CREATE INDEX ble_connection_errors_patient_created_idx
  ON public.ble_connection_errors (patient_id, created_at DESC);

-- ble_test_settings
CREATE TABLE public.ble_test_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_timeout_ms integer NOT NULL DEFAULT 8000,
  read_timeout_ms integer NOT NULL DEFAULT 8000,
  max_retries integer NOT NULL DEFAULT 2,
  retry_delay_ms integer NOT NULL DEFAULT 1500,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ble_test_settings TO authenticated;
GRANT ALL ON public.ble_test_settings TO service_role;

ALTER TABLE public.ble_test_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BLE settings self manage"
  ON public.ble_test_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ble_test_settings_updated_at
  BEFORE UPDATE ON public.ble_test_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

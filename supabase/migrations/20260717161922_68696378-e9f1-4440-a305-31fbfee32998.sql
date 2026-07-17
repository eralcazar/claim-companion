
CREATE TABLE IF NOT EXISTS public.hr_alert_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  min_bpm integer NOT NULL DEFAULT 55,
  max_bpm integer NOT NULL DEFAULT 110,
  enabled boolean NOT NULL DEFAULT true,
  notify_in_app boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hr_alert_settings_range_chk CHECK (min_bpm >= 20 AND max_bpm <= 260 AND min_bpm < max_bpm)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_alert_settings TO authenticated;
GRANT ALL ON public.hr_alert_settings TO service_role;

ALTER TABLE public.hr_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own hr alert settings"
ON public.hr_alert_settings FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_hr_alert_settings_updated_at
BEFORE UPDATE ON public.hr_alert_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

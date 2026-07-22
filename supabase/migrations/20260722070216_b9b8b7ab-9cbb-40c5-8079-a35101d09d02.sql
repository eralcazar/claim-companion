
-- 1. wearable_connection_tests
CREATE TABLE public.wearable_connection_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id uuid,
  tested_at timestamptz NOT NULL DEFAULT now(),
  platform text,
  availability boolean,
  overall_status text NOT NULL,
  duration_ms integer,
  trigger text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wearable_connection_tests TO authenticated;
GRANT ALL ON public.wearable_connection_tests TO service_role;
ALTER TABLE public.wearable_connection_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tests select" ON public.wearable_connection_tests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own tests insert" ON public.wearable_connection_tests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own tests update" ON public.wearable_connection_tests FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own tests delete" ON public.wearable_connection_tests FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_wct_user_tested ON public.wearable_connection_tests(user_id, tested_at DESC);
CREATE INDEX idx_wct_run ON public.wearable_connection_tests(run_id);

-- 2. wearable_connection_test_metrics
CREATE TABLE public.wearable_connection_test_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.wearable_connection_tests(id) ON DELETE CASCADE,
  metric text NOT NULL,
  status text NOT NULL,
  samples_count integer NOT NULL DEFAULT 0,
  last_value numeric,
  last_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wearable_connection_test_metrics TO authenticated;
GRANT ALL ON public.wearable_connection_test_metrics TO service_role;
ALTER TABLE public.wearable_connection_test_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metrics select" ON public.wearable_connection_test_metrics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wearable_connection_tests t WHERE t.id = test_id AND t.user_id = auth.uid()));
CREATE POLICY "own metrics insert" ON public.wearable_connection_test_metrics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.wearable_connection_tests t WHERE t.id = test_id AND t.user_id = auth.uid()));
CREATE POLICY "own metrics update" ON public.wearable_connection_test_metrics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wearable_connection_tests t WHERE t.id = test_id AND t.user_id = auth.uid()));
CREATE POLICY "own metrics delete" ON public.wearable_connection_test_metrics FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wearable_connection_tests t WHERE t.id = test_id AND t.user_id = auth.uid()));
CREATE INDEX idx_wctm_test ON public.wearable_connection_test_metrics(test_id);

-- 3. user_metric_device_preferences
CREATE TABLE public.user_metric_device_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL,
  device_id text NOT NULL,
  device_label text,
  priority integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, metric, device_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_metric_device_preferences TO authenticated;
GRANT ALL ON public.user_metric_device_preferences TO service_role;
ALTER TABLE public.user_metric_device_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pref select" ON public.user_metric_device_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own pref insert" ON public.user_metric_device_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own pref update" ON public.user_metric_device_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own pref delete" ON public.user_metric_device_preferences FOR DELETE TO authenticated USING (user_id = auth.uid());

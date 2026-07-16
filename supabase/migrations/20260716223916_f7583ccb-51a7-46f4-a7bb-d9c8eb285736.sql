-- 1) MCP audit
CREATE TABLE public.mcp_tool_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  tool_name text NOT NULL,
  params_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ok',
  error text,
  duration_ms integer,
  client_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mcp_tool_call_logs TO authenticated;
GRANT ALL ON public.mcp_tool_call_logs TO service_role;
ALTER TABLE public.mcp_tool_call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins ven todo el log mcp" ON public.mcp_tool_call_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX mcp_tool_call_logs_created_idx ON public.mcp_tool_call_logs(created_at DESC);
CREATE INDEX mcp_tool_call_logs_tool_idx ON public.mcp_tool_call_logs(tool_name);
CREATE INDEX mcp_tool_call_logs_user_idx ON public.mcp_tool_call_logs(user_id);

-- 2) Reading review audit
CREATE TABLE public.reading_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  reading_kind text NOT NULL CHECK (reading_kind IN ('blood_pressure','spo2','temperature','activity','glucose','heart_rate')),
  reading_id uuid NOT NULL,
  reviewer_id uuid,
  action text NOT NULL CHECK (action IN ('validate','discard')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reading_reviews TO authenticated;
GRANT ALL ON public.reading_reviews TO service_role;
ALTER TABLE public.reading_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ver revisiones si accede al paciente" ON public.reading_reviews
  FOR SELECT TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "insertar revisiones si accede al paciente" ON public.reading_reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.has_patient_access(auth.uid(), patient_id) AND reviewer_id = auth.uid());
CREATE INDEX reading_reviews_patient_idx ON public.reading_reviews(patient_id, created_at DESC);
CREATE INDEX reading_reviews_reading_idx ON public.reading_reviews(reading_kind, reading_id);

-- 3) Notification preferences
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pending_validated boolean NOT NULL DEFAULT true,
  clinical_alerts boolean NOT NULL DEFAULT true,
  reminders boolean NOT NULL DEFAULT true,
  system_messages boolean NOT NULL DEFAULT true,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gestiona sus preferencias" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_notification_preferences_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
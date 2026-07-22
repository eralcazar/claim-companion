
-- Kill switch global
INSERT INTO public.ai_settings (key, value)
VALUES ('external_providers_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Consentimientos por feature
CREATE TABLE IF NOT EXISTS public.ai_feature_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  provider text NOT NULL DEFAULT 'lovable',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feature_consents TO authenticated;
GRANT ALL ON public.ai_feature_consents TO service_role;
ALTER TABLE public.ai_feature_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own consents" ON public.ai_feature_consents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin views all consents" ON public.ai_feature_consents
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_ai_feature_consents_updated
  BEFORE UPDATE ON public.ai_feature_consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auditoría descargable de llamadas
CREATE TABLE IF NOT EXISTS public.ai_provider_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature_key text NOT NULL,
  provider text NOT NULL DEFAULT 'lovable',
  model text,
  sanitized boolean NOT NULL DEFAULT false,
  sanitization_notes text,
  fallback_used boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ok',
  input_chars integer DEFAULT 0,
  output_chars integer DEFAULT 0,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_provider_audit TO authenticated;
GRANT ALL ON public.ai_provider_audit TO service_role;
ALTER TABLE public.ai_provider_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user views own audit" ON public.ai_provider_audit
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin views all audit" ON public.ai_provider_audit
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "service inserts audit" ON public.ai_provider_audit
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS ai_provider_audit_created_idx ON public.ai_provider_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_provider_audit_feature_idx ON public.ai_provider_audit(feature_key, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_provider_audit_user_idx ON public.ai_provider_audit(user_id, created_at DESC);

-- Columnas complementarias en log de uso existente
ALTER TABLE public.ai_token_usage_log
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'lovable',
  ADD COLUMN IF NOT EXISTS sanitized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fallback_used boolean NOT NULL DEFAULT false;

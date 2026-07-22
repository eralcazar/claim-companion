
CREATE TABLE public.ai_api_key_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  secret_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('configured','rotated','verified','test_success','test_failed','checked')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  preview TEXT,
  length INTEGER,
  latency_ms INTEGER,
  model_used TEXT,
  error_message TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_api_key_audit_secret_created ON public.ai_api_key_audit(secret_name, created_at DESC);

GRANT SELECT ON public.ai_api_key_audit TO authenticated;
GRANT ALL ON public.ai_api_key_audit TO service_role;

ALTER TABLE public.ai_api_key_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view api key audit"
  ON public.ai_api_key_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

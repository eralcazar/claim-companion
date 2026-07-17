
-- ================= Bitácora de verificaciones =================
CREATE TABLE public.integrity_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verifier_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verifier_type text NOT NULL CHECK (verifier_type IN ('owner','broker','clinician','admin','public','system')),
  table_name text NOT NULL CHECK (table_name IN ('medical_records','recetas','estudios_solicitados')),
  record_id uuid NOT NULL,
  patient_id uuid,
  status text NOT NULL,
  payload_ok boolean,
  chain_ok boolean,
  signature_ok boolean,
  has_signature boolean,
  key_id text,
  algorithm_version text NOT NULL DEFAULT 'v1-sha256-hmac',
  share_token uuid,
  ip inet,
  user_agent text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ivl_created ON public.integrity_verification_log (created_at DESC);
CREATE INDEX idx_ivl_record ON public.integrity_verification_log (table_name, record_id);
CREATE INDEX idx_ivl_patient ON public.integrity_verification_log (patient_id);

GRANT SELECT ON public.integrity_verification_log TO authenticated;
GRANT ALL ON public.integrity_verification_log TO service_role;

ALTER TABLE public.integrity_verification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin lee todo el log" ON public.integrity_verification_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ================= Tokens de verificación compartible =================
CREATE TABLE public.integrity_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('patient_daily','record')),
  patient_id uuid NOT NULL,
  table_name text CHECK (table_name IN ('medical_records','recetas','estudios_solicitados')),
  record_id uuid,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ist_patient ON public.integrity_share_tokens (patient_id);
CREATE INDEX idx_ist_token ON public.integrity_share_tokens (token);

GRANT SELECT, INSERT, UPDATE ON public.integrity_share_tokens TO authenticated;
GRANT ALL ON public.integrity_share_tokens TO service_role;

ALTER TABLE public.integrity_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acceso por rol/expediente (select)" ON public.integrity_share_tokens
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR patient_id = auth.uid()
    OR public.has_patient_access(auth.uid(), patient_id)
    OR created_by = auth.uid()
  );

CREATE POLICY "crear token si tienes acceso al paciente" ON public.integrity_share_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR patient_id = auth.uid()
      OR public.has_patient_access(auth.uid(), patient_id)
    )
  );

CREATE POLICY "revocar propio o admin" ON public.integrity_share_tokens
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR patient_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
    OR patient_id = auth.uid()
  );

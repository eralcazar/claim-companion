
-- Sprint 1: Legal & consents foundation

-- Privacy acceptance tracking on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_version text,
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS curp text,
  ADD COLUMN IF NOT EXISTS rfc text;

-- Consents table (versioned, signed)
CREATE TABLE IF NOT EXISTS public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  consent_type text NOT NULL, -- 'privacy','treatment','telemedicine','broker_share','insurer_share','ai_kari','arco_request'
  version text NOT NULL,
  accepted boolean NOT NULL DEFAULT true,
  signature_data_url text,           -- base64 PNG de firma manuscrita (opcional)
  signature_pdf_path text,           -- ruta en bucket 'documents'
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own consents" ON public.consents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Personnel can view consents of their patients" ON public.consents
  FOR SELECT TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));

CREATE INDEX IF NOT EXISTS consents_patient_idx ON public.consents(patient_id, consent_type, created_at DESC);
CREATE INDEX IF NOT EXISTS consents_user_idx ON public.consents(user_id, consent_type);

CREATE TRIGGER trg_consents_updated
  BEFORE UPDATE ON public.consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ARCO requests (Acceso, Rectificación, Cancelación, Oposición)
CREATE TABLE IF NOT EXISTS public.arco_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('acceso','rectificacion','cancelacion','oposicion')),
  description text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  identity_document_path text,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_revision','completada','rechazada')),
  admin_notes text,
  responded_at timestamptz,
  responded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.arco_requests TO authenticated;
GRANT ALL ON public.arco_requests TO service_role;

ALTER TABLE public.arco_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own arco requests" ON public.arco_requests
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_arco_updated
  BEFORE UPDATE ON public.arco_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CURP validation trigger (formato oficial)
CREATE OR REPLACE FUNCTION public.validate_curp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.curp IS NOT NULL AND length(NEW.curp) > 0 THEN
    NEW.curp := upper(trim(NEW.curp));
    IF NEW.curp !~ '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$' THEN
      RAISE EXCEPTION 'CURP inválido: debe tener 18 caracteres con formato oficial';
    END IF;
  END IF;
  IF NEW.rfc IS NOT NULL AND length(NEW.rfc) > 0 THEN
    NEW.rfc := upper(trim(NEW.rfc));
    IF NEW.rfc !~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$' THEN
      RAISE EXCEPTION 'RFC inválido';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_validate_curp ON public.profiles;
CREATE TRIGGER trg_profiles_validate_curp
  BEFORE INSERT OR UPDATE OF curp, rfc ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_curp();

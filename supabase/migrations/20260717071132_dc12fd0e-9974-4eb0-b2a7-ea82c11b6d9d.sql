
-- =========================
-- 1. cfdi_config table
-- =========================
CREATE TABLE public.cfdi_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  emisor_type text NOT NULL CHECK (emisor_type IN ('farmacia','profesional')),
  branch_id uuid REFERENCES public.pharmacy_branches(id) ON DELETE SET NULL,
  rfc text NOT NULL,
  razon_social text NOT NULL,
  regimen_fiscal text NOT NULL DEFAULT '612',
  codigo_postal text NOT NULL,
  modo text NOT NULL DEFAULT 'sandbox' CHECK (modo IN ('sandbox','produccion')),
  pac text NOT NULL DEFAULT 'sw_sapien',
  serie text DEFAULT 'A',
  folio_inicial integer NOT NULL DEFAULT 1,
  csd_cer_path text,
  csd_key_path text,
  csd_password text,
  csd_no_certificado text,
  csd_vigencia_desde date,
  csd_vigencia_hasta date,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, emisor_type, branch_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cfdi_config TO authenticated;
GRANT ALL ON public.cfdi_config TO service_role;

ALTER TABLE public.cfdi_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cfdi_config admin all" ON public.cfdi_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "cfdi_config owner read" ON public.cfdi_config
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "cfdi_config owner update" ON public.cfdi_config
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER trg_cfdi_config_updated
  BEFORE UPDATE ON public.cfdi_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 2. Extend medico_invoices for CFDI
-- =========================
ALTER TABLE public.medico_invoices
  ADD COLUMN IF NOT EXISTS emisor_id uuid,
  ADD COLUMN IF NOT EXISTS emisor_type text,
  ADD COLUMN IF NOT EXISTS uuid_sat text,
  ADD COLUMN IF NOT EXISTS xml_url text,
  ADD COLUMN IF NOT EXISTS sello text,
  ADD COLUMN IF NOT EXISTS sello_sat text,
  ADD COLUMN IF NOT EXISTS no_certificado text,
  ADD COLUMN IF NOT EXISTS no_certificado_sat text,
  ADD COLUMN IF NOT EXISTS fecha_timbrado timestamptz,
  ADD COLUMN IF NOT EXISTS serie text,
  ADD COLUMN IF NOT EXISTS modo text,
  ADD COLUMN IF NOT EXISTS uso_cfdi text DEFAULT 'G03',
  ADD COLUMN IF NOT EXISTS forma_pago text DEFAULT '03',
  ADD COLUMN IF NOT EXISTS condiciones_pago text,
  ADD COLUMN IF NOT EXISTS moneda text DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS regimen_fiscal_receptor text,
  ADD COLUMN IF NOT EXISTS cp_receptor text,
  ADD COLUMN IF NOT EXISTS error_timbrado text,
  ADD COLUMN IF NOT EXISTS cadena_original text;

-- =========================
-- 3. cfdi_stamps (audit)
-- =========================
CREATE TABLE public.cfdi_stamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.medico_invoices(id) ON DELETE CASCADE,
  actor_id uuid,
  pac text NOT NULL,
  modo text NOT NULL,
  uuid_sat text,
  xml_url text,
  pdf_url text,
  request_summary jsonb,
  response_summary jsonb,
  ok boolean NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cfdi_stamps TO authenticated;
GRANT ALL ON public.cfdi_stamps TO service_role;

ALTER TABLE public.cfdi_stamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cfdi_stamps admin all" ON public.cfdi_stamps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "cfdi_stamps by invoice owner" ON public.cfdi_stamps
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.medico_invoices mi
    WHERE mi.id = cfdi_stamps.invoice_id
      AND (mi.doctor_id = auth.uid() OR mi.patient_id = auth.uid())
  ));

-- =========================
-- 4. Storage policies
-- =========================
-- cfdi-docs: emisor (doctor) o receptor (patient) puede leer; admin todo
CREATE POLICY "cfdi-docs admin all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'cfdi-docs' AND public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'cfdi-docs' AND public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "cfdi-docs read by invoice party" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cfdi-docs'
    AND EXISTS (
      SELECT 1 FROM public.medico_invoices mi
      WHERE (mi.xml_url LIKE '%' || storage.objects.name || '%'
             OR mi.pdf_url LIKE '%' || storage.objects.name || '%')
        AND (mi.doctor_id = auth.uid() OR mi.patient_id = auth.uid())
    )
  );

-- cfdi-csd: solo admin
CREATE POLICY "cfdi-csd admin only" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'cfdi-csd' AND public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'cfdi-csd' AND public.has_role(auth.uid(),'admin'::app_role));

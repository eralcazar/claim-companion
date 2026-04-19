-- Tabla claim_forms
CREATE TABLE IF NOT EXISTS public.claim_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  policy_id uuid,
  insurer text NOT NULL,
  form_code text NOT NULL,
  tramite_type text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  folio text,
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claim_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claim_forms"
  ON public.claim_forms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claim_forms"
  ON public.claim_forms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claim_forms"
  ON public.claim_forms FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own claim_forms"
  ON public.claim_forms FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all claim_forms"
  ON public.claim_forms FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brokers can view assigned claim_forms"
  ON public.claim_forms FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
      SELECT 1 FROM broker_patients bp
      WHERE bp.broker_id = auth.uid() AND bp.patient_id = claim_forms.user_id
    )
  );

CREATE TRIGGER update_claim_forms_updated_at
  BEFORE UPDATE ON public.claim_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar folio mensual consecutivo
CREATE OR REPLACE FUNCTION public.gen_folio(_insurer text, _code text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  siglas text;
  yearmonth text;
  consecutivo int;
  folio text;
BEGIN
  siglas := upper(regexp_replace(_insurer, '[^A-Za-z]', '', 'g'));
  IF length(siglas) > 6 THEN siglas := substring(siglas, 1, 6); END IF;
  yearmonth := to_char(now(), 'YYYYMM');

  SELECT COALESCE(MAX(
    CAST(split_part(folio, '-', 4) AS int)
  ), 0) + 1
  INTO consecutivo
  FROM public.claim_forms
  WHERE folio LIKE siglas || '-' || _code || '-' || yearmonth || '-%';

  folio := siglas || '-' || _code || '-' || yearmonth || '-' || lpad(consecutivo::text, 4, '0');
  RETURN folio;
END;
$$;

-- Política de Storage para bucket documents (claim-forms folder)
CREATE POLICY "Users can upload own claim form pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'claim-forms'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can read own claim form pdfs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'claim-forms'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can update own claim form pdfs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'claim-forms'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Users can delete own claim form pdfs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = 'claim-forms'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
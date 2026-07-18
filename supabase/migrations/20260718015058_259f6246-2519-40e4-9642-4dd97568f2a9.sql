
-- Enum resource types
DO $$ BEGIN
  CREATE TYPE public.share_resource_type AS ENUM ('appointment','receta','estudio','claim','format');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type public.share_resource_type NOT NULL,
  resource_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64'),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  revoked_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_links_owner ON public.share_links(owner_id);
CREATE INDEX idx_share_links_resource ON public.share_links(resource_type, resource_id);
CREATE INDEX idx_share_links_token ON public.share_links(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
GRANT ALL ON public.share_links TO service_role;

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages share links"
  ON public.share_links FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Trigger: validar expiración <= 30 días
CREATE OR REPLACE FUNCTION public.validate_share_link()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at > (COALESCE(NEW.created_at, now()) + interval '30 days') THEN
    RAISE EXCEPTION 'expires_at no puede superar 30 días desde la creación';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_share_links_validate
  BEFORE INSERT OR UPDATE ON public.share_links
  FOR EACH ROW EXECUTE FUNCTION public.validate_share_link();

-- Función pública para resolver un token (SECURITY DEFINER, sin login)
CREATE OR REPLACE FUNCTION public.resolve_share_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.share_links%ROWTYPE;
  v_data jsonb;
  v_owner_name text;
BEGIN
  SELECT * INTO v_link FROM public.share_links WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_link.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'revoked');
  END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF v_link.resource_type = 'appointment' THEN
    SELECT jsonb_build_object(
      'fecha', a.appointment_date,
      'tipo', a.appointment_type,
      'medico', COALESCE(a.doctor_name_manual, dp.full_name),
      'especialidad', esp.nombre,
      'direccion', a.address,
      'notas_publicas', NULL,
      'paciente_nombre', pp.full_name
    )
    INTO v_data
    FROM public.appointments a
    LEFT JOIN public.profiles dp ON dp.user_id = a.doctor_id
    LEFT JOIN public.profiles pp ON pp.user_id = a.user_id
    LEFT JOIN public.medicos m ON m.user_id = a.doctor_id
    LEFT JOIN public.especialidades esp ON esp.id = m.especialidad_id
    WHERE a.id = v_link.resource_id;
  ELSIF v_link.resource_type = 'receta' THEN
    SELECT jsonb_build_object(
      'fecha', r.fecha,
      'folio', r.folio,
      'medico', dp.full_name,
      'paciente_nombre', pp.full_name,
      'diagnostico', NULL
    ) INTO v_data
    FROM public.recetas r
    LEFT JOIN public.profiles dp ON dp.user_id = r.medico_id
    LEFT JOIN public.profiles pp ON pp.user_id = r.paciente_id
    WHERE r.id = v_link.resource_id;
  ELSIF v_link.resource_type = 'estudio' THEN
    SELECT jsonb_build_object(
      'fecha', e.created_at,
      'folio', e.folio,
      'medico', dp.full_name,
      'paciente_nombre', pp.full_name
    ) INTO v_data
    FROM public.estudios_solicitados e
    LEFT JOIN public.profiles dp ON dp.user_id = e.medico_id
    LEFT JOIN public.profiles pp ON pp.user_id = e.paciente_id
    WHERE e.id = v_link.resource_id;
  ELSIF v_link.resource_type = 'claim' THEN
    SELECT jsonb_build_object(
      'fecha', c.created_at,
      'aseguradora', c.insurer,
      'estado', c.status,
      'paciente_nombre', pp.full_name
    ) INTO v_data
    FROM public.claims c
    LEFT JOIN public.profiles pp ON pp.user_id = c.user_id
    WHERE c.id = v_link.resource_id;
  ELSIF v_link.resource_type = 'format' THEN
    SELECT jsonb_build_object(
      'fecha', cf.created_at,
      'tipo', cf.form_code,
      'aseguradora', cf.insurer,
      'folio', cf.folio,
      'paciente_nombre', pp.full_name
    ) INTO v_data
    FROM public.claim_forms cf
    LEFT JOIN public.claims c ON c.id = cf.claim_id
    LEFT JOIN public.profiles pp ON pp.user_id = c.user_id
    WHERE cf.id = v_link.resource_id;
  END IF;

  IF v_data IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'resource_missing');
  END IF;

  -- Registrar vista (best-effort)
  UPDATE public.share_links
    SET view_count = view_count + 1, last_viewed_at = now()
    WHERE id = v_link.id;

  RETURN jsonb_build_object(
    'ok', true,
    'resource_type', v_link.resource_type,
    'data', v_data,
    'expires_at', v_link.expires_at
  );
END $$;

-- Permite invocarla anónimamente
GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO anon, authenticated;

-- ============================
-- Búsquedas guardadas: renombrar/reordenar/fijar
-- ============================
ALTER TABLE public.especialidad_busquedas
  ADD COLUMN IF NOT EXISTS nombre_custom text,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS orden integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_esp_busq_user_order
  ON public.especialidad_busquedas(user_id, pinned DESC, orden ASC, created_at DESC);

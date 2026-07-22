
-- 1) Extender ai_provider_policy con proveedor externo opcional
ALTER TABLE public.ai_provider_policy
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'lovable',
  ADD COLUMN IF NOT EXISTS external_endpoint text;

ALTER TABLE public.ai_provider_policy
  DROP CONSTRAINT IF EXISTS ai_provider_policy_provider_check;
ALTER TABLE public.ai_provider_policy
  ADD CONSTRAINT ai_provider_policy_provider_check
  CHECK (provider IN ('lovable','apifreellm'));

-- 2) Catálogo de proveedores externos (admin gestiona; autenticados leen)
CREATE TABLE IF NOT EXISTS public.ai_external_providers (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  endpoint text NOT NULL,
  aviso_legal text NOT NULL,
  legal_version text NOT NULL DEFAULT 'v1',
  activo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_external_providers TO authenticated;
GRANT ALL ON public.ai_external_providers TO service_role;

ALTER TABLE public.ai_external_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_external_providers_select_auth" ON public.ai_external_providers;
CREATE POLICY "ai_external_providers_select_auth"
  ON public.ai_external_providers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ai_external_providers_admin_all" ON public.ai_external_providers;
CREATE POLICY "ai_external_providers_admin_all"
  ON public.ai_external_providers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_ai_external_providers_updated ON public.ai_external_providers;
CREATE TRIGGER trg_ai_external_providers_updated
  BEFORE UPDATE ON public.ai_external_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Semilla ApiFreeLLM (inactivo por defecto — un admin debe activarlo explícitamente)
INSERT INTO public.ai_external_providers (id, nombre, endpoint, aviso_legal, legal_version, activo)
VALUES (
  'apifreellm',
  'ApiFreeLLM',
  'https://apifreellm.com/api/chat/completions',
  'Proveedor externo gratuito compatible con OpenAI. Solo se envían prompts sanitizados (sin CURP, RFC, email, teléfono, direcciones, fechas ni números largos). Requiere consentimiento explícito del usuario por feature.',
  'v1',
  false
) ON CONFLICT (id) DO NOTHING;

-- 3) Reescribir can_call_external_ai para diferenciar Lovable vs externo
CREATE OR REPLACE FUNCTION public.can_call_external_ai(_user_id uuid, _feature_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_provider text;
  v_kill_off boolean;
  v_granted boolean;
  v_active boolean;
BEGIN
  -- Provider de la feature (default lovable si no hay política)
  SELECT provider INTO v_provider
    FROM public.ai_provider_policy
   WHERE feature_key = _feature_key
   LIMIT 1;
  v_provider := COALESCE(v_provider, 'lovable');

  -- Con Lovable AI no aplica gate externo
  IF v_provider = 'lovable' THEN
    RETURN jsonb_build_object('allowed', true, 'provider', 'lovable');
  END IF;

  -- Kill switch global
  SELECT COALESCE((value)::text = 'false', false) INTO v_kill_off
    FROM public.ai_settings WHERE key = 'external_providers_enabled';
  IF v_kill_off THEN
    RETURN jsonb_build_object('allowed', false, 'provider', v_provider, 'reason', 'kill_switch');
  END IF;

  -- Proveedor debe estar activo en el catálogo
  SELECT activo INTO v_active FROM public.ai_external_providers WHERE id = v_provider;
  IF v_active IS NULL OR v_active = false THEN
    RETURN jsonb_build_object('allowed', false, 'provider', v_provider, 'reason', 'provider_inactive');
  END IF;

  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'provider', v_provider, 'reason', 'no_user');
  END IF;

  -- Consentimiento del usuario para esta feature
  SELECT granted INTO v_granted
    FROM public.ai_feature_consents
    WHERE user_id = _user_id AND feature_key = _feature_key;

  IF v_granted IS NULL OR v_granted = false THEN
    RETURN jsonb_build_object('allowed', false, 'provider', v_provider, 'reason', 'consent_revoked');
  END IF;

  RETURN jsonb_build_object('allowed', true, 'provider', v_provider);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.can_call_external_ai(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_call_external_ai(uuid, text) TO authenticated, service_role;


-- Extender auditoría de IA con evidencia de sanitización y campos PII detectados
ALTER TABLE public.ai_provider_audit
  ADD COLUMN IF NOT EXISTS sanitized_prompt text,
  ADD COLUMN IF NOT EXISTS pii_fields_detected jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS consent_checked boolean NOT NULL DEFAULT false;

-- RPC para verificar si un usuario puede llamar a un proveedor externo para una feature
CREATE OR REPLACE FUNCTION public.can_call_external_ai(_user_id uuid, _feature_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kill_off boolean;
  v_granted boolean;
BEGIN
  SELECT COALESCE((value)::text = 'false', false) INTO v_kill_off
    FROM public.ai_settings WHERE key = 'external_providers_enabled';
  IF v_kill_off THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'kill_switch');
  END IF;

  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_user');
  END IF;

  SELECT granted INTO v_granted
    FROM public.ai_feature_consents
    WHERE user_id = _user_id AND feature_key = _feature_key;

  IF v_granted IS NULL OR v_granted = false THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'consent_revoked');
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- RPC para que edge functions registren la auditoría bypassing RLS de usuario
CREATE OR REPLACE FUNCTION public.log_ai_audit(
  _user_id uuid,
  _feature_key text,
  _provider text,
  _model text,
  _sanitized boolean,
  _sanitization_notes text,
  _sanitized_prompt text,
  _pii_fields jsonb,
  _fallback_used boolean,
  _status text,
  _blocked_reason text,
  _consent_checked boolean,
  _input_chars integer,
  _output_chars integer,
  _latency_ms integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.ai_provider_audit(
    user_id, feature_key, provider, model, sanitized, sanitization_notes,
    sanitized_prompt, pii_fields_detected, fallback_used, status,
    blocked_reason, consent_checked, input_chars, output_chars, latency_ms
  ) VALUES (
    _user_id, _feature_key, _provider, COALESCE(_model,''),
    COALESCE(_sanitized,false), _sanitization_notes,
    _sanitized_prompt, COALESCE(_pii_fields,'[]'::jsonb),
    COALESCE(_fallback_used,false), COALESCE(_status,'ok'),
    _blocked_reason, COALESCE(_consent_checked,false),
    COALESCE(_input_chars,0), COALESCE(_output_chars,0), _latency_ms
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_call_external_ai(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_ai_audit(uuid, text, text, text, boolean, text, text, jsonb, boolean, text, text, boolean, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_call_external_ai(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_ai_audit(uuid, text, text, text, boolean, text, text, jsonb, boolean, text, text, boolean, integer, integer, integer) TO service_role;

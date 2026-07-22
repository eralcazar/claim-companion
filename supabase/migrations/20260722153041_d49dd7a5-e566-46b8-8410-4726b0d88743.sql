-- 1. Columnas para trazabilidad Gateway y costo real Lovable
ALTER TABLE public.ai_token_usage_log
  ADD COLUMN IF NOT EXISTS gateway_run_id text,
  ADD COLUMN IF NOT EXISTS gateway_log_id text,
  ADD COLUMN IF NOT EXISTS gateway_credits numeric(14,6),
  ADD COLUMN IF NOT EXISTS gateway_cost_cents integer,
  ADD COLUMN IF NOT EXISTS feature_key text;

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_log_gateway_log_id
  ON public.ai_token_usage_log (gateway_log_id)
  WHERE gateway_log_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_log_feature_created
  ON public.ai_token_usage_log (feature_key, created_at DESC);

-- 2. RPC comparativa por modelo (estimado in-app vs real Lovable)
CREATE OR REPLACE FUNCTION public.get_kari_usage_comparison_by_model(
  _from timestamptz,
  _to timestamptz,
  _user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  model text,
  requests bigint,
  total_tokens bigint,
  cost_estimated_micros bigint,
  gateway_credits numeric,
  gateway_cost_cents bigint,
  matched_requests bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(l.model, 'unknown') AS model,
    COUNT(*)::bigint AS requests,
    COALESCE(SUM(l.total_tokens), 0)::bigint AS total_tokens,
    COALESCE(SUM(l.cost_usd_micros), 0)::bigint AS cost_estimated_micros,
    COALESCE(SUM(l.gateway_credits), 0)::numeric AS gateway_credits,
    COALESCE(SUM(l.gateway_cost_cents), 0)::bigint AS gateway_cost_cents,
    COUNT(*) FILTER (WHERE l.gateway_credits IS NOT NULL)::bigint AS matched_requests
  FROM public.ai_token_usage_log l
  WHERE l.created_at >= _from
    AND l.created_at < _to
    AND (_user_id IS NULL OR l.user_id = _user_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role))
  GROUP BY 1
  ORDER BY 3 DESC;
$$;

-- 3. RPC comparativa por feature/asistente
CREATE OR REPLACE FUNCTION public.get_kari_usage_comparison_by_feature(
  _from timestamptz,
  _to timestamptz,
  _user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  feature_key text,
  requests bigint,
  total_tokens bigint,
  cost_estimated_micros bigint,
  gateway_credits numeric,
  gateway_cost_cents bigint,
  matched_requests bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(l.feature_key, 'kari-chat') AS feature_key,
    COUNT(*)::bigint,
    COALESCE(SUM(l.total_tokens), 0)::bigint,
    COALESCE(SUM(l.cost_usd_micros), 0)::bigint,
    COALESCE(SUM(l.gateway_credits), 0)::numeric,
    COALESCE(SUM(l.gateway_cost_cents), 0)::bigint,
    COUNT(*) FILTER (WHERE l.gateway_credits IS NOT NULL)::bigint
  FROM public.ai_token_usage_log l
  WHERE l.created_at >= _from
    AND l.created_at < _to
    AND (_user_id IS NULL OR l.user_id = _user_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role))
  GROUP BY 1
  ORDER BY 3 DESC;
$$;

-- 4. RPC diaria comparativa
CREATE OR REPLACE FUNCTION public.get_kari_usage_comparison_daily(
  _from timestamptz,
  _to timestamptz,
  _user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  day date,
  total_tokens bigint,
  cost_estimated_micros bigint,
  gateway_credits numeric,
  gateway_cost_cents bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (l.created_at AT TIME ZONE 'UTC')::date AS day,
    COALESCE(SUM(l.total_tokens), 0)::bigint,
    COALESCE(SUM(l.cost_usd_micros), 0)::bigint,
    COALESCE(SUM(l.gateway_credits), 0)::numeric,
    COALESCE(SUM(l.gateway_cost_cents), 0)::bigint
  FROM public.ai_token_usage_log l
  WHERE l.created_at >= _from
    AND l.created_at < _to
    AND (_user_id IS NULL OR l.user_id = _user_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role))
  GROUP BY 1
  ORDER BY 1;
$$;

-- 5. RPC upsert real (para importador CSV)
CREATE OR REPLACE FUNCTION public.upsert_gateway_real_cost(
  _gateway_log_id text,
  _credits numeric,
  _cost_cents integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.ai_token_usage_log
     SET gateway_credits = _credits,
         gateway_cost_cents = _cost_cents
   WHERE gateway_log_id = _gateway_log_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kari_usage_comparison_by_model(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kari_usage_comparison_by_feature(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kari_usage_comparison_daily(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_gateway_real_cost(text, numeric, integer) TO authenticated;
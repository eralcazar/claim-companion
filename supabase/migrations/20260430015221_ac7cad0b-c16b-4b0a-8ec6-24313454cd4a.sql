
-- ============================================================
-- 1. ai_token_usage_log (auditoría granular de consumo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_token_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid,
  message_id uuid,
  model text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_usd_micros bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_log_user_created
  ON public.ai_token_usage_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_log_created
  ON public.ai_token_usage_log (created_at DESC);

ALTER TABLE public.ai_token_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_token_usage_log_select_own_or_admin"
  ON public.ai_token_usage_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- INSERT solo desde service role (edge function). No policy para clientes.

-- ============================================================
-- 2. ai_token_monthly_limits (topes por rol/paquete)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_token_monthly_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  monthly_token_cap integer NOT NULL CHECK (monthly_token_cap >= 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Único parcial: una fila por (plan, rol). plan_id NULL = todos los planes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_token_monthly_limits_plan_role
  ON public.ai_token_monthly_limits (COALESCE(plan_id::text, 'ALL'), role);

ALTER TABLE public.ai_token_monthly_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_token_monthly_limits_admin_all"
  ON public.ai_token_monthly_limits
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ai_token_monthly_limits_read_authenticated"
  ON public.ai_token_monthly_limits
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER trg_ai_token_monthly_limits_updated_at
  BEFORE UPDATE ON public.ai_token_monthly_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: paciente Gratuito = 5000 tokens/mes; PLAN INICIAL paciente = 50000.
INSERT INTO public.ai_token_monthly_limits (plan_id, role, monthly_token_cap)
SELECT id, 'paciente'::app_role, 5000 FROM public.subscription_plans WHERE nombre = 'Gratuito'
ON CONFLICT DO NOTHING;

INSERT INTO public.ai_token_monthly_limits (plan_id, role, monthly_token_cap)
SELECT id, 'paciente'::app_role, 50000 FROM public.subscription_plans WHERE nombre = 'PLAN INICIAL'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Función check_kari_monthly_limit
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_kari_monthly_limit(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
  v_cap integer;
  v_period_start timestamptz := date_trunc('month', now());
  v_period_end timestamptz := date_trunc('month', now()) + interval '1 month';
  v_plan_id uuid;
BEGIN
  SELECT plan_id INTO v_plan_id
  FROM public.subscriptions
  WHERE user_id = _user_id
    AND status IN ('active','trialing')
    AND (current_period_end IS NULL OR current_period_end > now())
  ORDER BY updated_at DESC LIMIT 1;

  -- cap más restrictivo: primero busca por plan+rol, luego rol con plan NULL
  SELECT MIN(monthly_token_cap) INTO v_cap
  FROM public.ai_token_monthly_limits l
  JOIN public.user_roles ur ON ur.role = l.role
  WHERE ur.user_id = _user_id
    AND l.enabled = true
    AND (l.plan_id = v_plan_id OR l.plan_id IS NULL);

  IF v_cap IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'cap', null, 'used', 0, 'resets_at', v_period_end);
  END IF;

  SELECT COALESCE(SUM(total_tokens), 0) INTO v_used
  FROM public.ai_token_usage_log
  WHERE user_id = _user_id
    AND created_at >= v_period_start
    AND created_at < v_period_end;

  RETURN jsonb_build_object(
    'allowed', v_used < v_cap,
    'cap', v_cap,
    'used', v_used,
    'resets_at', v_period_end
  );
END;
$$;

-- ============================================================
-- 4. RPCs admin: resumen y por usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_kari_usage_summary(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumed bigint;
  v_cost_micros bigint;
  v_users bigint;
  v_granted bigint;
  v_purchased bigint;
  v_revenue_cents bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;

  SELECT COALESCE(SUM(total_tokens),0), COALESCE(SUM(cost_usd_micros),0), COUNT(DISTINCT user_id)
  INTO v_consumed, v_cost_micros, v_users
  FROM public.ai_token_usage_log
  WHERE created_at >= _from AND created_at < _to;

  SELECT COALESCE(SUM(tokens),0), COALESCE(SUM(amount_cents),0)
  INTO v_purchased, v_revenue_cents
  FROM public.ai_token_purchases
  WHERE status = 'completed' AND created_at >= _from AND created_at < _to;

  SELECT COALESCE(SUM(lifetime_granted),0) INTO v_granted FROM public.ai_token_balances;

  RETURN jsonb_build_object(
    'tokens_consumed', v_consumed,
    'cost_usd_micros', v_cost_micros,
    'active_users', v_users,
    'tokens_purchased', v_purchased,
    'revenue_cents', v_revenue_cents,
    'lifetime_granted_total', v_granted
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kari_usage_by_user(
  _from timestamptz, _to timestamptz, _limit int DEFAULT 50, _offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  messages bigint,
  total_tokens bigint,
  cost_usd_micros bigint,
  last_activity timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;

  RETURN QUERY
  SELECT
    l.user_id,
    p.email,
    p.full_name,
    COUNT(*)::bigint AS messages,
    COALESCE(SUM(l.total_tokens),0)::bigint AS total_tokens,
    COALESCE(SUM(l.cost_usd_micros),0)::bigint AS cost_usd_micros,
    MAX(l.created_at) AS last_activity
  FROM public.ai_token_usage_log l
  LEFT JOIN public.profiles p ON p.user_id = l.user_id
  WHERE l.created_at >= _from AND l.created_at < _to
  GROUP BY l.user_id, p.email, p.full_name
  ORDER BY total_tokens DESC
  LIMIT _limit OFFSET _offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kari_usage_daily(_from timestamptz, _to timestamptz)
RETURNS TABLE (day date, total_tokens bigint, cost_usd_micros bigint, messages bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;

  RETURN QUERY
  SELECT (created_at AT TIME ZONE 'America/Mexico_City')::date AS day,
         COALESCE(SUM(total_tokens),0)::bigint,
         COALESCE(SUM(cost_usd_micros),0)::bigint,
         COUNT(*)::bigint
  FROM public.ai_token_usage_log
  WHERE created_at >= _from AND created_at < _to
  GROUP BY 1
  ORDER BY 1;
END;
$$;

-- ============================================================
-- 5. Registrar features de Kari en matriz de permisos
-- ============================================================
-- role_permissions: kari y kari_tokens activos para todos excepto lab/farmacia.
INSERT INTO public.role_permissions (role, feature_key, allowed) VALUES
  ('admin','kari',true),('broker','kari',true),('paciente','kari',true),
  ('medico','kari',true),('enfermero','kari',true),
  ('laboratorio','kari',false),('farmacia','kari',false),
  ('admin','kari_tokens',true),('broker','kari_tokens',true),('paciente','kari_tokens',true),
  ('medico','kari_tokens',true),('enfermero','kari_tokens',true),
  ('laboratorio','kari_tokens',false),('farmacia','kari_tokens',false),
  ('admin','kari_admin',true),
  ('broker','kari_admin',false),('paciente','kari_admin',false),('medico','kari_admin',false),
  ('enfermero','kari_admin',false),('laboratorio','kari_admin',false),('farmacia','kari_admin',false)
ON CONFLICT (role, feature_key) DO NOTHING;

-- plan_role_features: activar kari y kari_tokens en TODOS los paquetes para los roles permitidos.
INSERT INTO public.plan_role_features (plan_id, role, feature_key, allowed)
SELECT sp.id, r.role, f.feature_key, true
FROM public.subscription_plans sp
CROSS JOIN (VALUES ('admin'::app_role),('broker'::app_role),('paciente'::app_role),
                   ('medico'::app_role),('enfermero'::app_role)) r(role)
CROSS JOIN (VALUES ('kari'),('kari_tokens')) f(feature_key)
ON CONFLICT (plan_id, role, feature_key) DO NOTHING;

-- kari_admin: solo admin en todos los paquetes.
INSERT INTO public.plan_role_features (plan_id, role, feature_key, allowed)
SELECT sp.id, 'admin'::app_role, 'kari_admin', true
FROM public.subscription_plans sp
ON CONFLICT (plan_id, role, feature_key) DO NOTHING;

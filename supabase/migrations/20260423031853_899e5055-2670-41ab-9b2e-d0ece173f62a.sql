-- OCR quotas + add-on packs

-- 1. OCR quota balances per user
CREATE TABLE public.ocr_quotas (
  user_id uuid PRIMARY KEY,
  subscription_balance integer NOT NULL DEFAULT 0,
  addon_balance integer NOT NULL DEFAULT 0,
  period_start timestamptz,
  period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ocr_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own quota"
  ON public.ocr_quotas FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage quotas"
  ON public.ocr_quotas FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Usage log
CREATE TABLE public.ocr_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  feature text NOT NULL DEFAULT 'extract_study_indicators',
  pages integer NOT NULL DEFAULT 1,
  source text NOT NULL CHECK (source IN ('subscription','addon')),
  resource_id uuid
);

CREATE INDEX idx_ocr_usage_log_user ON public.ocr_usage_log(user_id, used_at DESC);
ALTER TABLE public.ocr_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own usage"
  ON public.ocr_usage_log FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. OCR packs catalog (one-time purchase)
CREATE TABLE public.ocr_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  cantidad_escaneos integer NOT NULL,
  precio_centavos integer NOT NULL,
  moneda text NOT NULL DEFAULT 'MXN',
  stripe_product_id text,
  stripe_price_id text,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ocr_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active packs"
  ON public.ocr_packs FOR SELECT
  TO authenticated
  USING (activo = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage packs"
  ON public.ocr_packs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ocr_packs_updated
  BEFORE UPDATE ON public.ocr_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Pack purchases log
CREATE TABLE public.ocr_pack_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id uuid REFERENCES public.ocr_packs(id) ON DELETE SET NULL,
  cantidad_escaneos integer NOT NULL,
  precio_centavos integer NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'MXN',
  stripe_session_id text,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'sandbox',
  granted_by uuid,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ocr_pack_purchases_user ON public.ocr_pack_purchases(user_id, created_at DESC);
ALTER TABLE public.ocr_pack_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own purchases"
  ON public.ocr_pack_purchases FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage purchases"
  ON public.ocr_pack_purchases FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Add ocr_pages_per_month to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS ocr_pages_per_month integer NOT NULL DEFAULT 0;

-- 6. Sync subscription quota helper
CREATE OR REPLACE FUNCTION public.sync_subscription_ocr_quota(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pages integer := 0;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  SELECT COALESCE(sp.ocr_pages_per_month, 0), s.current_period_start, s.current_period_end
  INTO v_pages, v_period_start, v_period_end
  FROM public.subscriptions s
  LEFT JOIN public.subscription_plans sp ON sp.id = s.plan_id
  WHERE s.user_id = _user_id
    AND s.status IN ('active','trialing')
  ORDER BY s.updated_at DESC
  LIMIT 1;

  INSERT INTO public.ocr_quotas (user_id, subscription_balance, period_start, period_end, updated_at)
  VALUES (_user_id, v_pages, v_period_start, v_period_end, now())
  ON CONFLICT (user_id) DO UPDATE
    SET subscription_balance = EXCLUDED.subscription_balance,
        period_start = EXCLUDED.period_start,
        period_end = EXCLUDED.period_end,
        updated_at = now();
END;
$$;

-- 7. Consume quota (subscription first, then addon)
CREATE OR REPLACE FUNCTION public.consume_ocr_quota(_user_id uuid, _pages integer, _resource_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q public.ocr_quotas%ROWTYPE;
  remaining_to_consume integer := _pages;
  from_sub integer := 0;
  from_addon integer := 0;
BEGIN
  IF _pages IS NULL OR _pages <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_pages');
  END IF;

  -- Refresh subscription window if expired
  SELECT * INTO q FROM public.ocr_quotas WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.ocr_quotas (user_id) VALUES (_user_id)
    RETURNING * INTO q;
  END IF;

  -- If subscription period expired, reset subscription balance via sync
  IF q.period_end IS NOT NULL AND q.period_end < now() THEN
    PERFORM public.sync_subscription_ocr_quota(_user_id);
    SELECT * INTO q FROM public.ocr_quotas WHERE user_id = _user_id FOR UPDATE;
  END IF;

  IF (COALESCE(q.subscription_balance,0) + COALESCE(q.addon_balance,0)) < _pages THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'quota_exceeded',
      'subscription_balance', COALESCE(q.subscription_balance,0),
      'addon_balance', COALESCE(q.addon_balance,0)
    );
  END IF;

  IF q.subscription_balance >= remaining_to_consume THEN
    from_sub := remaining_to_consume;
    remaining_to_consume := 0;
  ELSE
    from_sub := q.subscription_balance;
    remaining_to_consume := remaining_to_consume - from_sub;
  END IF;

  IF remaining_to_consume > 0 THEN
    from_addon := remaining_to_consume;
  END IF;

  UPDATE public.ocr_quotas
    SET subscription_balance = subscription_balance - from_sub,
        addon_balance = addon_balance - from_addon,
        updated_at = now()
  WHERE user_id = _user_id;

  IF from_sub > 0 THEN
    INSERT INTO public.ocr_usage_log (user_id, pages, source, resource_id)
    VALUES (_user_id, from_sub, 'subscription', _resource_id);
  END IF;
  IF from_addon > 0 THEN
    INSERT INTO public.ocr_usage_log (user_id, pages, source, resource_id)
    VALUES (_user_id, from_addon, 'addon', _resource_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'consumed_subscription', from_sub,
    'consumed_addon', from_addon,
    'remaining_subscription', q.subscription_balance - from_sub,
    'remaining_addon', q.addon_balance - from_addon
  );
END;
$$;

-- 8. Add credits manually (admin / pack purchase)
CREATE OR REPLACE FUNCTION public.add_ocr_credits(_user_id uuid, _pages integer, _source text DEFAULT 'addon')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _pages IS NULL OR _pages <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.ocr_quotas (user_id, addon_balance, subscription_balance, updated_at)
  VALUES (
    _user_id,
    CASE WHEN _source = 'addon' THEN _pages ELSE 0 END,
    CASE WHEN _source = 'subscription' THEN _pages ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET addon_balance = public.ocr_quotas.addon_balance + CASE WHEN _source = 'addon' THEN _pages ELSE 0 END,
        subscription_balance = public.ocr_quotas.subscription_balance + CASE WHEN _source = 'subscription' THEN _pages ELSE 0 END,
        updated_at = now();
END;
$$;

-- 9. Seed default packs
INSERT INTO public.ocr_packs (nombre, descripcion, cantidad_escaneos, precio_centavos, moneda, orden) VALUES
  ('Paquete 10', '10 escaneos OCR adicionales (no caducan)', 10, 9900, 'MXN', 1),
  ('Paquete 25', '25 escaneos OCR adicionales (no caducan)', 25, 19900, 'MXN', 2),
  ('Paquete 50', '50 escaneos OCR adicionales (no caducan)', 50, 34900, 'MXN', 3);

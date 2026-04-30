
-- =====================================================
-- A) AI Token packs (catálogo)
-- =====================================================
CREATE TABLE public.ai_token_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  tokens integer NOT NULL CHECK (tokens > 0),
  precio_centavos integer NOT NULL CHECK (precio_centavos >= 0),
  moneda text NOT NULL DEFAULT 'MXN',
  stripe_product_id text,
  stripe_price_id text,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_token_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_token_packs_select_active_authenticated"
  ON public.ai_token_packs FOR SELECT
  TO authenticated
  USING (activo = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "ai_token_packs_admin_all"
  ON public.ai_token_packs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ai_token_packs_updated
  BEFORE UPDATE ON public.ai_token_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial (stripe_price_id se llena después)
INSERT INTO public.ai_token_packs (codigo, nombre, descripcion, tokens, precio_centavos, moneda, orden)
VALUES
  ('kari_tokens_mini', 'Paquete Mini', '10,000 tokens (~50 mensajes cortos)', 10000, 4900, 'MXN', 1),
  ('kari_tokens_plus', 'Paquete Plus', '50,000 tokens (~250 mensajes)', 50000, 19900, 'MXN', 2),
  ('kari_tokens_pro',  'Paquete Pro',  '200,000 tokens (~1000 mensajes)', 200000, 59900, 'MXN', 3);

-- =====================================================
-- B) AI Token balances
-- =====================================================
CREATE TABLE public.ai_token_balances (
  user_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_granted integer NOT NULL DEFAULT 0,
  lifetime_consumed integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_token_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_token_balances_select_own"
  ON public.ai_token_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Sin INSERT/UPDATE/DELETE público; solo SECURITY DEFINER funcs

-- =====================================================
-- C) AI Token purchases
-- =====================================================
CREATE TABLE public.ai_token_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id uuid REFERENCES public.ai_token_packs(id) ON DELETE SET NULL,
  tokens integer NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'MXN',
  status text NOT NULL DEFAULT 'pending', -- pending | completed | failed
  stripe_session_id text UNIQUE,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_token_purchases_user ON public.ai_token_purchases(user_id);

ALTER TABLE public.ai_token_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_token_purchases_select_own"
  ON public.ai_token_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- D) AI chat conversations + messages
-- =====================================================
CREATE TABLE public.ai_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nueva conversación',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_conversations_user ON public.ai_chat_conversations(user_id, updated_at DESC);

ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_conv_owner_select" ON public.ai_chat_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_chat_conv_owner_insert" ON public.ai_chat_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_chat_conv_owner_update" ON public.ai_chat_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ai_chat_conv_owner_delete" ON public.ai_chat_conversations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_ai_chat_conv_updated
  BEFORE UPDATE ON public.ai_chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  tokens_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_chat_messages_conv ON public.ai_chat_messages(conversation_id, created_at);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_msg_owner_select" ON public.ai_chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Sin INSERT público (solo edge functions con service role)

-- =====================================================
-- E) Funciones para sumar/consumir tokens
-- =====================================================
CREATE OR REPLACE FUNCTION public.add_ai_tokens(_user_id uuid, _tokens integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _tokens IS NULL OR _tokens <= 0 THEN RETURN; END IF;
  INSERT INTO public.ai_token_balances (user_id, balance, lifetime_granted, updated_at)
  VALUES (_user_id, _tokens, _tokens, now())
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.ai_token_balances.balance + _tokens,
        lifetime_granted = public.ai_token_balances.lifetime_granted + _tokens,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_ai_tokens(_user_id uuid, _tokens integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
BEGIN
  IF _tokens IS NULL OR _tokens <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_tokens');
  END IF;

  SELECT balance INTO current_balance FROM public.ai_token_balances WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.ai_token_balances (user_id, balance) VALUES (_user_id, 0);
    current_balance := 0;
  END IF;

  IF current_balance < _tokens THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_tokens', 'balance', current_balance);
  END IF;

  UPDATE public.ai_token_balances
    SET balance = balance - _tokens,
        lifetime_consumed = lifetime_consumed + _tokens,
        updated_at = now()
    WHERE user_id = _user_id;

  RETURN jsonb_build_object('ok', true, 'remaining', current_balance - _tokens);
END;
$$;

-- =====================================================
-- F) Modificar handle_new_user para regalar 2000 tokens
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_plan uuid;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, active_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.email, ''),
    'paciente'::app_role
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'paciente');

  SELECT id INTO v_free_plan FROM public.subscription_plans WHERE nombre = 'Gratuito' LIMIT 1;
  IF v_free_plan IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, environment)
    VALUES (NEW.id, v_free_plan, 'active', now(), now() + interval '100 years', 'manual');
    PERFORM public.sync_subscription_ocr_quota(NEW.id);
  END IF;

  -- Tokens de bienvenida para Kari (2000 ≈ 10 conversaciones cortas)
  PERFORM public.add_ai_tokens(NEW.id, 2000);

  RETURN NEW;
END;
$$;

-- =====================================================
-- G) Backfill: dar tokens de bienvenida a usuarios existentes sin balance
-- =====================================================
INSERT INTO public.ai_token_balances (user_id, balance, lifetime_granted)
SELECT p.user_id, 2000, 2000
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.ai_token_balances b WHERE b.user_id = p.user_id);

-- =====================================================
-- H) Realtime + admin SELECT en ocr_quotas
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_quotas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_token_balances;

ALTER TABLE public.ocr_quotas REPLICA IDENTITY FULL;
ALTER TABLE public.ai_token_balances REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ocr_quotas' AND policyname = 'ocr_quotas_admin_select_all'
  ) THEN
    CREATE POLICY "ocr_quotas_admin_select_all" ON public.ocr_quotas
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

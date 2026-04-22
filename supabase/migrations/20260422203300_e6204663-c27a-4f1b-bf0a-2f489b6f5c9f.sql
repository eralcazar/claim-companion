
-- ============================================
-- 1. Extender pharmacy_catalog
-- ============================================
ALTER TABLE public.pharmacy_catalog
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS imagen_url text,
  ADD COLUMN IF NOT EXISTS descripcion_larga text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pharmacy_catalog_sku
  ON public.pharmacy_catalog(sku) WHERE sku IS NOT NULL;

-- ============================================
-- 2. Inventario
-- ============================================
CREATE TABLE IF NOT EXISTS public.pharmacy_inventory (
  catalog_id uuid PRIMARY KEY REFERENCES public.pharmacy_catalog(id) ON DELETE CASCADE,
  stock_actual integer NOT NULL DEFAULT 0,
  stock_minimo integer NOT NULL DEFAULT 0,
  ubicacion text,
  costo_unitario_centavos integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy and admin view inventory"
  ON public.pharmacy_inventory FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'));

CREATE POLICY "Pharmacy and admin manage inventory"
  ON public.pharmacy_inventory FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'));

CREATE TRIGGER trg_pharmacy_inventory_updated
  BEFORE UPDATE ON public.pharmacy_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Movimientos
DO $$ BEGIN
  CREATE TYPE public.inventory_movement_type AS ENUM ('entrada', 'salida', 'surtido', 'ajuste');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pharmacy_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.pharmacy_catalog(id) ON DELETE CASCADE,
  tipo public.inventory_movement_type NOT NULL,
  cantidad integer NOT NULL,
  motivo text,
  order_id uuid REFERENCES public.pharmacy_orders(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_catalog ON public.pharmacy_inventory_movements(catalog_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.pharmacy_inventory_movements(created_at DESC);

ALTER TABLE public.pharmacy_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy and admin view movements"
  ON public.pharmacy_inventory_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'));

CREATE POLICY "Pharmacy and admin insert movements"
  ON public.pharmacy_inventory_movements FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'))
    AND created_by = auth.uid()
  );

-- Función para aplicar movimiento (incrementa/decrementa stock)
CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta integer;
BEGIN
  -- entrada y ajuste suman; salida y surtido restan
  IF NEW.tipo IN ('entrada', 'ajuste') THEN
    delta := NEW.cantidad;
  ELSE
    delta := -NEW.cantidad;
  END IF;

  INSERT INTO public.pharmacy_inventory(catalog_id, stock_actual)
  VALUES (NEW.catalog_id, GREATEST(delta, 0))
  ON CONFLICT (catalog_id) DO UPDATE
    SET stock_actual = public.pharmacy_inventory.stock_actual + delta,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_inventory_movement
  AFTER INSERT ON public.pharmacy_inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_movement();

-- ============================================
-- 3. Subscription plans + features
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  precio_mensual_centavos integer NOT NULL DEFAULT 0,
  precio_anual_centavos integer NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'mxn',
  stripe_product_id text,
  stripe_price_id_mensual text,
  stripe_price_id_anual text,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active plans"
  ON public.subscription_plans FOR SELECT TO authenticated
  USING (activo OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manages plans"
  ON public.subscription_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscription_plans_updated
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  limite_mensual integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view plan features"
  ON public.plan_features FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin manages plan features"
  ON public.plan_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. Subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  product_id text,
  price_id text,
  status text NOT NULL DEFAULT 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin manages all subscriptions"
  ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: ¿tiene el usuario una suscripción activa con esta feature?
CREATE OR REPLACE FUNCTION public.user_has_plan_feature(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    JOIN public.plan_features pf ON pf.plan_id = s.plan_id
    WHERE s.user_id = _user_id
      AND pf.feature_key = _feature
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;

-- ============================================
-- 5. Storage bucket para imágenes de producto
-- ============================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('pharmacy-products', 'pharmacy-products', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read pharmacy product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pharmacy-products');

CREATE POLICY "Pharmacy/admin upload pharmacy product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pharmacy-products'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'))
  );

CREATE POLICY "Pharmacy/admin update pharmacy product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pharmacy-products'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'))
  );

CREATE POLICY "Pharmacy/admin delete pharmacy product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pharmacy-products'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'))
  );

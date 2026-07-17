
-- 1) Extender pos_customers con crédito
ALTER TABLE public.pos_customers
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS ciudad text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS limite_credito_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dias_credito integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notas text;

-- 2) Cargos (deudas derivadas de pedidos a crédito)
CREATE TABLE IF NOT EXISTS public.pharmacy_customer_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.pos_customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.pharmacy_orders(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.pharmacy_branches(id),
  folio text,
  monto_centavos integer NOT NULL CHECK (monto_centavos > 0),
  saldo_centavos integer NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  vence_el date NOT NULL,
  notas text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pcc_customer ON public.pharmacy_customer_charges(customer_id);
CREATE INDEX IF NOT EXISTS idx_pcc_saldo ON public.pharmacy_customer_charges(customer_id) WHERE saldo_centavos > 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_customer_charges TO authenticated;
GRANT ALL ON public.pharmacy_customer_charges TO service_role;
ALTER TABLE public.pharmacy_customer_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farmacia ve cargos" ON public.pharmacy_customer_charges FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role));
CREATE POLICY "farmacia inserta cargos" ON public.pharmacy_customer_charges FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role));
CREATE POLICY "farmacia actualiza cargos" ON public.pharmacy_customer_charges FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role));

-- 3) Pagos / abonos
CREATE TABLE IF NOT EXISTS public.pharmacy_customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.pos_customers(id) ON DELETE CASCADE,
  charge_id uuid REFERENCES public.pharmacy_customer_charges(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.pharmacy_branches(id),
  folio text,
  monto_centavos integer NOT NULL CHECK (monto_centavos > 0),
  metodo text NOT NULL DEFAULT 'efectivo',
  referencia text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  notas text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pcp_customer ON public.pharmacy_customer_payments(customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_customer_payments TO authenticated;
GRANT ALL ON public.pharmacy_customer_payments TO service_role;
ALTER TABLE public.pharmacy_customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farmacia ve abonos" ON public.pharmacy_customer_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role));
CREATE POLICY "farmacia inserta abonos" ON public.pharmacy_customer_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role));

-- 4) Trigger: al insertar cargo, sube saldo del cliente
CREATE OR REPLACE FUNCTION public.apply_customer_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.saldo_centavos IS NULL THEN
    NEW.saldo_centavos := NEW.monto_centavos;
  END IF;
  UPDATE public.pos_customers
     SET saldo_centavos = COALESCE(saldo_centavos,0) + NEW.monto_centavos, updated_at = now()
   WHERE id = NEW.customer_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_apply_customer_charge ON public.pharmacy_customer_charges;
CREATE TRIGGER trg_apply_customer_charge BEFORE INSERT ON public.pharmacy_customer_charges
  FOR EACH ROW EXECUTE FUNCTION public.apply_customer_charge();

-- 5) Trigger: al registrar abono, aplica FIFO sobre cargos abiertos y baja saldo
CREATE OR REPLACE FUNCTION public.apply_customer_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_remaining integer := NEW.monto_centavos;
  v_take integer;
  r record;
BEGIN
  -- Aplica al cargo específico si viene, si no FIFO por fecha
  IF NEW.charge_id IS NOT NULL THEN
    UPDATE public.pharmacy_customer_charges
       SET saldo_centavos = GREATEST(saldo_centavos - v_remaining, 0), updated_at = now()
     WHERE id = NEW.charge_id;
  ELSE
    FOR r IN
      SELECT id, saldo_centavos FROM public.pharmacy_customer_charges
       WHERE customer_id = NEW.customer_id AND saldo_centavos > 0
       ORDER BY vence_el ASC, fecha ASC
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_take := LEAST(r.saldo_centavos, v_remaining);
      UPDATE public.pharmacy_customer_charges
         SET saldo_centavos = saldo_centavos - v_take, updated_at = now()
       WHERE id = r.id;
      v_remaining := v_remaining - v_take;
    END LOOP;
  END IF;

  UPDATE public.pos_customers
     SET saldo_centavos = GREATEST(COALESCE(saldo_centavos,0) - NEW.monto_centavos, 0), updated_at = now()
   WHERE id = NEW.customer_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_apply_customer_payment ON public.pharmacy_customer_payments;
CREATE TRIGGER trg_apply_customer_payment AFTER INSERT ON public.pharmacy_customer_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_customer_payment();

-- 6) Aging por cliente
CREATE OR REPLACE FUNCTION public.pharmacy_customer_aging(_customer_id uuid)
RETURNS TABLE(
  bucket_0_30 integer,
  bucket_31_60 integer,
  bucket_61_90 integer,
  bucket_90_plus integer,
  total integer,
  vencido integer,
  proximo_vence date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(SUM(CASE WHEN (CURRENT_DATE - vence_el) BETWEEN -3650 AND 30 THEN saldo_centavos ELSE 0 END),0)::int,
    COALESCE(SUM(CASE WHEN (CURRENT_DATE - vence_el) BETWEEN 31 AND 60 THEN saldo_centavos ELSE 0 END),0)::int,
    COALESCE(SUM(CASE WHEN (CURRENT_DATE - vence_el) BETWEEN 61 AND 90 THEN saldo_centavos ELSE 0 END),0)::int,
    COALESCE(SUM(CASE WHEN (CURRENT_DATE - vence_el) > 90 THEN saldo_centavos ELSE 0 END),0)::int,
    COALESCE(SUM(saldo_centavos),0)::int,
    COALESCE(SUM(CASE WHEN vence_el < CURRENT_DATE THEN saldo_centavos ELSE 0 END),0)::int,
    (SELECT MIN(vence_el) FROM public.pharmacy_customer_charges
      WHERE customer_id = _customer_id AND saldo_centavos > 0 AND vence_el >= CURRENT_DATE)
  FROM public.pharmacy_customer_charges
  WHERE customer_id = _customer_id AND saldo_centavos > 0;
$$;

-- 7) updated_at triggers
DROP TRIGGER IF EXISTS trg_pcp_updated ON public.pharmacy_customer_payments;
CREATE TRIGGER trg_pcp_updated BEFORE UPDATE ON public.pharmacy_customer_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_pcc_updated ON public.pharmacy_customer_charges;
CREATE TRIGGER trg_pcc_updated BEFORE UPDATE ON public.pharmacy_customer_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

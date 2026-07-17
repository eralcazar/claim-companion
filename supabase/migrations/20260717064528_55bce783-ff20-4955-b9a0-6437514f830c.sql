
-- ============================================================
-- 1) Extender pharmacy_orders (POS + CFDI)
-- ============================================================
ALTER TABLE public.pharmacy_orders
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.pharmacy_branches(id),
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS folio text,
  ADD COLUMN IF NOT EXISTS cliente_nombre text,
  ADD COLUMN IF NOT EXISTS cliente_rfc text,
  ADD COLUMN IF NOT EXISTS cliente_email text,
  ADD COLUMN IF NOT EXISTS cliente_cp text,
  ADD COLUMN IF NOT EXISTS uso_cfdi text,
  ADD COLUMN IF NOT EXISTS regimen_fiscal_receptor text,
  ADD COLUMN IF NOT EXISTS forma_pago text,
  ADD COLUMN IF NOT EXISTS metodo_pago text,
  ADD COLUMN IF NOT EXISTS requiere_cfdi boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cfdi_uuid text,
  ADD COLUMN IF NOT EXISTS cfdi_xml_path text,
  ADD COLUMN IF NOT EXISTS cfdi_pdf_path text,
  ADD COLUMN IF NOT EXISTS cfdi_timbrado_at timestamptz,
  ADD COLUMN IF NOT EXISTS descuento_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iva_centavos integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_branch ON public.pharmacy_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_folio ON public.pharmacy_orders(folio);

-- ============================================================
-- 2) Extender pharmacy_order_items (lote + costo + margen)
-- ============================================================
ALTER TABLE public.pharmacy_order_items
  ADD COLUMN IF NOT EXISTS lote_id uuid REFERENCES public.pharmacy_lots(id),
  ADD COLUMN IF NOT EXISTS costo_unitario_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_aplicado_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS codigo_sat text,
  ADD COLUMN IF NOT EXISTS iva_pct numeric(5,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pharmacy_order_items_lote ON public.pharmacy_order_items(lote_id);

-- ============================================================
-- 3) Trigger: al insertar item con lote, descuenta el lote
-- ============================================================
CREATE OR REPLACE FUNCTION public.pos_apply_lot_on_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch uuid;
BEGIN
  IF NEW.lote_id IS NULL THEN RETURN NEW; END IF;
  SELECT branch_id INTO v_branch FROM public.pharmacy_lots WHERE id = NEW.lote_id;
  IF v_branch IS NULL THEN RAISE EXCEPTION 'Lote no encontrado'; END IF;
  INSERT INTO public.pharmacy_lot_movements(
    lot_id, catalog_id, branch_id, tipo, cantidad,
    motivo, referencia_tipo, referencia_id, created_by
  ) VALUES (
    NEW.lote_id, NEW.catalog_id, v_branch, 'salida', NEW.cantidad,
    'Venta POS', 'pharmacy_order_item', NEW.id, auth.uid()
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pos_apply_lot ON public.pharmacy_order_items;
CREATE TRIGGER trg_pos_apply_lot
  AFTER INSERT ON public.pharmacy_order_items
  FOR EACH ROW EXECUTE FUNCTION public.pos_apply_lot_on_item();

REVOKE EXECUTE ON FUNCTION public.pos_apply_lot_on_item() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 4) pharmacy_purchases (compras a proveedores)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pharmacy_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folio text,
  branch_id uuid NOT NULL REFERENCES public.pharmacy_branches(id),
  supplier_id uuid REFERENCES public.pharmacy_suppliers(id),
  supplier_nombre text NOT NULL,
  supplier_rfc text,
  fuente text NOT NULL DEFAULT 'manual', -- 'manual' | 'cfdi'
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  subtotal_centavos integer NOT NULL DEFAULT 0,
  iva_centavos integer NOT NULL DEFAULT 0,
  total_centavos integer NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'MXN',
  cfdi_uuid text,
  cfdi_xml_path text,
  cfdi_pdf_path text,
  estado text NOT NULL DEFAULT 'borrador', -- borrador|aplicada|cancelada
  notas text,
  aplicada_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_purchases TO authenticated;
GRANT ALL ON public.pharmacy_purchases TO service_role;
ALTER TABLE public.pharmacy_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmacia admin ve compras"
  ON public.pharmacy_purchases FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmacia'::app_role));

CREATE POLICY "Farmacia crea compras"
  ON public.pharmacy_purchases FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmacia'::app_role));

CREATE POLICY "Farmacia edita compras"
  ON public.pharmacy_purchases FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmacia'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmacia'::app_role));

CREATE POLICY "Admin borra compras"
  ON public.pharmacy_purchases FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_purchases_updated
  BEFORE UPDATE ON public.pharmacy_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_purchases_branch ON public.pharmacy_purchases(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.pharmacy_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_uuid ON public.pharmacy_purchases(cfdi_uuid);

-- ============================================================
-- 5) pharmacy_purchase_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pharmacy_purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.pharmacy_purchases(id) ON DELETE CASCADE,
  catalog_id uuid REFERENCES public.pharmacy_catalog(id),
  descripcion text NOT NULL,
  clave_sat text,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  costo_unitario_centavos integer NOT NULL CHECK (costo_unitario_centavos >= 0),
  iva_pct numeric(5,2) NOT NULL DEFAULT 0,
  subtotal_centavos integer NOT NULL DEFAULT 0,
  lote text,
  caducidad date,
  lot_id uuid REFERENCES public.pharmacy_lots(id),
  ubicacion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_purchase_items TO authenticated;
GRANT ALL ON public.pharmacy_purchase_items TO service_role;
ALTER TABLE public.pharmacy_purchase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items via parent"
  ON public.pharmacy_purchase_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pharmacy_purchases p WHERE p.id = pharmacy_purchase_items.purchase_id
                 AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmacia'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pharmacy_purchases p WHERE p.id = pharmacy_purchase_items.purchase_id
                 AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'farmacia'::app_role))));

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.pharmacy_purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_catalog ON public.pharmacy_purchase_items(catalog_id);

-- ============================================================
-- 6) Folio generator
-- ============================================================
CREATE OR REPLACE FUNCTION public.gen_pharmacy_folio(_prefix text, _branch uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_year text := to_char(now(),'YYYY');
  v_seq int;
BEGIN
  SELECT COALESCE(codigo, substring(upper(nombre),1,3)) INTO v_code
    FROM public.pharmacy_branches WHERE id = _branch;
  v_code := COALESCE(v_code, 'BR');

  IF _prefix = 'POS' THEN
    SELECT COALESCE(MAX(CAST(split_part(folio,'-',4) AS int)),0)+1 INTO v_seq
      FROM public.pharmacy_orders
     WHERE folio LIKE _prefix||'-'||v_code||'-'||v_year||'-%';
  ELSE
    SELECT COALESCE(MAX(CAST(split_part(folio,'-',4) AS int)),0)+1 INTO v_seq
      FROM public.pharmacy_purchases
     WHERE folio LIKE _prefix||'-'||v_code||'-'||v_year||'-%';
  END IF;
  RETURN _prefix||'-'||v_code||'-'||v_year||'-'||lpad(v_seq::text,5,'0');
END $$;

REVOKE EXECUTE ON FUNCTION public.gen_pharmacy_folio(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gen_pharmacy_folio(text, uuid) TO authenticated;

-- Autofoliado en compras
CREATE OR REPLACE FUNCTION public.pharmacy_purchases_folio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := public.gen_pharmacy_folio('COM', NEW.branch_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_purchases_folio ON public.pharmacy_purchases;
CREATE TRIGGER trg_purchases_folio
  BEFORE INSERT ON public.pharmacy_purchases
  FOR EACH ROW EXECUTE FUNCTION public.pharmacy_purchases_folio();

REVOKE EXECUTE ON FUNCTION public.pharmacy_purchases_folio() FROM PUBLIC, anon, authenticated;

-- Autofoliado POS
CREATE OR REPLACE FUNCTION public.pharmacy_orders_folio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    IF NEW.branch_id IS NOT NULL THEN
      NEW.folio := public.gen_pharmacy_folio(CASE WHEN NEW.tipo='pos' THEN 'POS' ELSE 'ORD' END, NEW.branch_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_folio ON public.pharmacy_orders;
CREATE TRIGGER trg_orders_folio
  BEFORE INSERT ON public.pharmacy_orders
  FOR EACH ROW EXECUTE FUNCTION public.pharmacy_orders_folio();

REVOKE EXECUTE ON FUNCTION public.pharmacy_orders_folio() FROM PUBLIC, anon, authenticated;

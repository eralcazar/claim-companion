
-- ============================================================
-- SPRINT 1 · FARMACIA: SUCURSALES + LOTES + FEFO
-- ============================================================

-- 1) SUCURSALES
CREATE TABLE IF NOT EXISTS public.pharmacy_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  codigo text UNIQUE,
  direccion text,
  ciudad text,
  estado text,
  cp text,
  telefono text,
  rfc_emisor text,
  razon_social_emisor text,
  regimen_fiscal text,
  cp_expedicion text,
  activo boolean NOT NULL DEFAULT true,
  es_principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_branches TO authenticated;
GRANT ALL ON public.pharmacy_branches TO service_role;

ALTER TABLE public.pharmacy_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_admin_all" ON public.pharmacy_branches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "branches_farmacia_read" ON public.pharmacy_branches
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'farmacia'::app_role));

CREATE TRIGGER trg_pharmacy_branches_updated
  BEFORE UPDATE ON public.pharmacy_branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pharmacy_branches (nombre, codigo, es_principal, activo)
VALUES ('Farmacia Principal', 'PRIN', true, true)
ON CONFLICT (codigo) DO NOTHING;


-- 2) EXTENSIÓN CATÁLOGO
ALTER TABLE public.pharmacy_catalog
  ADD COLUMN IF NOT EXISTS codigo_barras text,
  ADD COLUMN IF NOT EXISTS codigo_sat text,
  ADD COLUMN IF NOT EXISTS principio_activo text,
  ADD COLUMN IF NOT EXISTS requiere_receta boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS iva_pct numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_minimo_pct numeric(5,2) DEFAULT 15,
  ADD COLUMN IF NOT EXISTS margen_objetivo_pct numeric(5,2) DEFAULT 30,
  ADD COLUMN IF NOT EXISTS costo_promedio_centavos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS branch_id_default uuid REFERENCES public.pharmacy_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ecommerce_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_catalog_codigo_barras ON public.pharmacy_catalog(codigo_barras) WHERE codigo_barras IS NOT NULL;


-- 3) PROVEEDORES (referenciados por lotes; se detallan en Sprint 2)
CREATE TABLE IF NOT EXISTS public.pharmacy_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfc text UNIQUE,
  razon_social text NOT NULL,
  nombre_comercial text,
  contacto_nombre text,
  contacto_email text,
  contacto_telefono text,
  dias_credito integer NOT NULL DEFAULT 0,
  saldo_centavos integer NOT NULL DEFAULT 0,
  calificacion integer CHECK (calificacion IS NULL OR (calificacion BETWEEN 1 AND 5)),
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_suppliers TO authenticated;
GRANT ALL ON public.pharmacy_suppliers TO service_role;

ALTER TABLE public.pharmacy_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_admin_all" ON public.pharmacy_suppliers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "suppliers_farmacia_read" ON public.pharmacy_suppliers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'farmacia'::app_role));

CREATE POLICY "suppliers_farmacia_write" ON public.pharmacy_suppliers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'farmacia'::app_role));

CREATE POLICY "suppliers_farmacia_update" ON public.pharmacy_suppliers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'farmacia'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'farmacia'::app_role));

CREATE TRIGGER trg_pharmacy_suppliers_updated
  BEFORE UPDATE ON public.pharmacy_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 4) LOTES
CREATE TABLE IF NOT EXISTS public.pharmacy_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.pharmacy_catalog(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.pharmacy_branches(id) ON DELETE RESTRICT,
  lote text NOT NULL,
  caducidad date NOT NULL,
  cantidad_inicial integer NOT NULL CHECK (cantidad_inicial >= 0),
  cantidad_actual integer NOT NULL CHECK (cantidad_actual >= 0),
  costo_unitario_centavos integer NOT NULL DEFAULT 0 CHECK (costo_unitario_centavos >= 0),
  proveedor_id uuid REFERENCES public.pharmacy_suppliers(id) ON DELETE SET NULL,
  purchase_id uuid,
  ubicacion text,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','agotado','vencido','bloqueado')),
  fecha_ingreso date NOT NULL DEFAULT CURRENT_DATE,
  notas text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalog_id, branch_id, lote)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_lots TO authenticated;
GRANT ALL ON public.pharmacy_lots TO service_role;

ALTER TABLE public.pharmacy_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lots_admin_all" ON public.pharmacy_lots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "lots_farmacia_read" ON public.pharmacy_lots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'farmacia'::app_role));

CREATE POLICY "lots_farmacia_write" ON public.pharmacy_lots
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'farmacia'::app_role));

CREATE POLICY "lots_farmacia_update" ON public.pharmacy_lots
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'farmacia'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'farmacia'::app_role));

CREATE INDEX IF NOT EXISTS idx_lots_catalog_branch ON public.pharmacy_lots(catalog_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_lots_caducidad ON public.pharmacy_lots(caducidad) WHERE estado = 'activo';
CREATE INDEX IF NOT EXISTS idx_lots_estado ON public.pharmacy_lots(estado);

CREATE TRIGGER trg_pharmacy_lots_updated
  BEFORE UPDATE ON public.pharmacy_lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: recalcular estado del lote automáticamente
CREATE OR REPLACE FUNCTION public.pharmacy_lot_auto_estado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estado NOT IN ('bloqueado') THEN
    IF NEW.caducidad < CURRENT_DATE THEN
      NEW.estado := 'vencido';
    ELSIF NEW.cantidad_actual <= 0 THEN
      NEW.estado := 'agotado';
    ELSE
      NEW.estado := 'activo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pharmacy_lots_estado
  BEFORE INSERT OR UPDATE ON public.pharmacy_lots
  FOR EACH ROW EXECUTE FUNCTION public.pharmacy_lot_auto_estado();


-- 5) MOVIMIENTOS DE LOTE
CREATE TABLE IF NOT EXISTS public.pharmacy_lot_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES public.pharmacy_lots(id) ON DELETE CASCADE,
  catalog_id uuid NOT NULL REFERENCES public.pharmacy_catalog(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.pharmacy_branches(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('entrada','salida','ajuste','merma','traspaso','caducidad')),
  cantidad integer NOT NULL CHECK (cantidad <> 0),
  motivo text,
  referencia_tipo text,
  referencia_id uuid,
  costo_unitario_centavos integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pharmacy_lot_movements TO authenticated;
GRANT ALL ON public.pharmacy_lot_movements TO service_role;

ALTER TABLE public.pharmacy_lot_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lot_mov_admin_all" ON public.pharmacy_lot_movements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "lot_mov_farmacia_read" ON public.pharmacy_lot_movements
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'farmacia'::app_role));

CREATE POLICY "lot_mov_farmacia_insert" ON public.pharmacy_lot_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'farmacia'::app_role));

CREATE INDEX IF NOT EXISTS idx_lot_movements_lot ON public.pharmacy_lot_movements(lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lot_movements_ref ON public.pharmacy_lot_movements(referencia_tipo, referencia_id);


-- 6) TRIGGER: aplicar movimiento al stock del lote y validar
CREATE OR REPLACE FUNCTION public.apply_lot_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lot public.pharmacy_lots%ROWTYPE;
  v_delta integer;
BEGIN
  SELECT * INTO v_lot FROM public.pharmacy_lots WHERE id = NEW.lot_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote no existe: %', NEW.lot_id;
  END IF;

  IF v_lot.estado = 'bloqueado' THEN
    RAISE EXCEPTION 'Lote bloqueado: %', v_lot.lote;
  END IF;

  IF NEW.tipo IN ('salida','merma','traspaso','caducidad') THEN
    IF v_lot.estado = 'vencido' AND NEW.tipo <> 'caducidad' THEN
      RAISE EXCEPTION 'No se puede realizar salida de lote vencido (lote %, caducidad %)', v_lot.lote, v_lot.caducidad;
    END IF;
    v_delta := -abs(NEW.cantidad);
  ELSE
    v_delta := abs(NEW.cantidad);
  END IF;

  IF (v_lot.cantidad_actual + v_delta) < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente en lote % (actual %, intento %)', v_lot.lote, v_lot.cantidad_actual, v_delta;
  END IF;

  UPDATE public.pharmacy_lots
     SET cantidad_actual = cantidad_actual + v_delta,
         updated_at = now()
   WHERE id = NEW.lot_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_lot_movement
  AFTER INSERT ON public.pharmacy_lot_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_lot_movement();


-- 7) FUNCIÓN FEFO: sugerir lotes por caducidad ascendente
CREATE OR REPLACE FUNCTION public.sugerir_lotes_fefo(
  _catalog_id uuid,
  _branch_id uuid,
  _cantidad integer
)
RETURNS TABLE (
  lot_id uuid,
  lote text,
  caducidad date,
  cantidad_disponible integer,
  cantidad_a_tomar integer,
  costo_unitario_centavos integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer := _cantidad;
  v_take integer;
  r record;
BEGIN
  IF _cantidad IS NULL OR _cantidad <= 0 THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT id, lote AS lote_txt, caducidad AS cad, cantidad_actual, costo_unitario_centavos AS costo
      FROM public.pharmacy_lots
     WHERE catalog_id = _catalog_id
       AND branch_id = _branch_id
       AND estado = 'activo'
       AND cantidad_actual > 0
       AND caducidad >= CURRENT_DATE
     ORDER BY caducidad ASC, created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_take := LEAST(r.cantidad_actual, v_remaining);
    lot_id := r.id;
    lote := r.lote_txt;
    caducidad := r.cad;
    cantidad_disponible := r.cantidad_actual;
    cantidad_a_tomar := v_take;
    costo_unitario_centavos := r.costo;
    RETURN NEXT;
    v_remaining := v_remaining - v_take;
  END LOOP;
END;
$$;


-- 8) FUNCIÓN: stock total por producto/sucursal (suma de lotes activos no vencidos)
CREATE OR REPLACE FUNCTION public.pharmacy_stock_disponible(_catalog_id uuid, _branch_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cantidad_actual),0)::integer
    FROM public.pharmacy_lots
   WHERE catalog_id = _catalog_id
     AND branch_id = _branch_id
     AND estado = 'activo'
     AND caducidad >= CURRENT_DATE;
$$;


-- 9) FUNCIÓN: alertas de rotación
CREATE OR REPLACE FUNCTION public.pharmacy_lots_rotation_alerts(_branch_id uuid DEFAULT NULL)
RETURNS TABLE (
  lot_id uuid,
  catalog_id uuid,
  producto_nombre text,
  branch_id uuid,
  lote text,
  caducidad date,
  dias_a_caducar integer,
  cantidad_actual integer,
  alerta text,
  severidad text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.catalog_id, c.nombre, l.branch_id, l.lote, l.caducidad,
         (l.caducidad - CURRENT_DATE)::int AS dias,
         l.cantidad_actual,
         CASE
           WHEN l.caducidad < CURRENT_DATE THEN 'Vencido'
           WHEN l.caducidad < CURRENT_DATE + 30 THEN 'Vence en <30d'
           WHEN l.caducidad < CURRENT_DATE + 90 THEN 'Vence en <90d'
           WHEN l.caducidad < CURRENT_DATE + 180 THEN 'Vence en <180d'
           ELSE 'OK'
         END AS alerta,
         CASE
           WHEN l.caducidad < CURRENT_DATE THEN 'critico'
           WHEN l.caducidad < CURRENT_DATE + 30 THEN 'alto'
           WHEN l.caducidad < CURRENT_DATE + 90 THEN 'medio'
           WHEN l.caducidad < CURRENT_DATE + 180 THEN 'bajo'
           ELSE 'ninguno'
         END AS severidad
    FROM public.pharmacy_lots l
    JOIN public.pharmacy_catalog c ON c.id = l.catalog_id
   WHERE l.cantidad_actual > 0
     AND (l.estado IN ('activo','vencido'))
     AND (_branch_id IS NULL OR l.branch_id = _branch_id)
     AND l.caducidad < CURRENT_DATE + 180
   ORDER BY l.caducidad ASC;
END;
$$;


-- 10) EXTENDER pharmacy_inventory_movements (compat con módulo actual)
ALTER TABLE public.pharmacy_inventory_movements
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.pharmacy_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES public.pharmacy_lots(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inv_mov_branch ON public.pharmacy_inventory_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_lot ON public.pharmacy_inventory_movements(lot_id);

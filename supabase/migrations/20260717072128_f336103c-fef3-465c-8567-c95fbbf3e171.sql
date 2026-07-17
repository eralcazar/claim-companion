
-- SPRINT 3: PRICE HISTORY
CREATE TABLE IF NOT EXISTS public.pharmacy_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.pharmacy_catalog(id) ON DELETE CASCADE,
  precio_anterior_centavos integer NOT NULL,
  precio_nuevo_centavos integer NOT NULL,
  motivo text,
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pharmacy_price_history TO authenticated;
GRANT ALL ON public.pharmacy_price_history TO service_role;
ALTER TABLE public.pharmacy_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmacia lee historial precios" ON public.pharmacy_price_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role) OR public.has_role(auth.uid(),'farmacia'::app_role));
CREATE POLICY "farmacia inserta historial precios" ON public.pharmacy_price_history FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role));

-- SPRINT 3: COMPETITOR PRICES
CREATE TABLE IF NOT EXISTS public.pharmacy_competitor_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.pharmacy_catalog(id) ON DELETE CASCADE,
  competidor text NOT NULL,
  precio_centavos integer NOT NULL,
  url text,
  disponibilidad text DEFAULT 'disponible',
  fuente text NOT NULL DEFAULT 'manual',
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_competitor_prices_catalog ON public.pharmacy_competitor_prices(catalog_id, captured_at DESC);
GRANT SELECT ON public.pharmacy_competitor_prices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pharmacy_competitor_prices TO authenticated;
GRANT ALL ON public.pharmacy_competitor_prices TO service_role;
ALTER TABLE public.pharmacy_competitor_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publico lee competencia" ON public.pharmacy_competitor_prices FOR SELECT USING (true);
CREATE POLICY "farmacia gestiona competencia" ON public.pharmacy_competitor_prices FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role));
DROP TRIGGER IF EXISTS trg_competitor_prices_updated ON public.pharmacy_competitor_prices;
CREATE TRIGGER trg_competitor_prices_updated BEFORE UPDATE ON public.pharmacy_competitor_prices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SPRINT 3: PRICE CHANGE REQUESTS
CREATE TABLE IF NOT EXISTS public.pharmacy_price_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id uuid NOT NULL REFERENCES public.pharmacy_catalog(id) ON DELETE CASCADE,
  precio_actual_centavos integer NOT NULL,
  precio_propuesto_centavos integer NOT NULL,
  razon text,
  estado text NOT NULL DEFAULT 'pendiente',
  requested_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  notas_revision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pharmacy_price_change_requests TO authenticated;
GRANT ALL ON public.pharmacy_price_change_requests TO service_role;
ALTER TABLE public.pharmacy_price_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmacia ve solicitudes precio" ON public.pharmacy_price_change_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role) OR requested_by = auth.uid());
CREATE POLICY "farmacia crea solicitudes precio" ON public.pharmacy_price_change_requests FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role) OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin_farmacia aprueba precio" ON public.pharmacy_price_change_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role));
DROP TRIGGER IF EXISTS trg_price_change_requests_updated ON public.pharmacy_price_change_requests;
CREATE TRIGGER trg_price_change_requests_updated BEFORE UPDATE ON public.pharmacy_price_change_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SPRINT 4: POS SESSIONS
CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.pharmacy_branches(id),
  cajero_id uuid NOT NULL REFERENCES auth.users(id),
  fondo_inicial_centavos integer NOT NULL DEFAULT 0,
  fondo_final_centavos integer,
  ventas_efectivo_centavos integer NOT NULL DEFAULT 0,
  ventas_tarjeta_centavos integer NOT NULL DEFAULT 0,
  ventas_transferencia_centavos integer NOT NULL DEFAULT 0,
  total_ventas_centavos integer NOT NULL DEFAULT 0,
  num_ventas integer NOT NULL DEFAULT 0,
  arqueo_diferencia_centavos integer,
  estado text NOT NULL DEFAULT 'abierta',
  notas_apertura text,
  notas_cierre text,
  abierta_at timestamptz NOT NULL DEFAULT now(),
  cerrada_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_branch ON public.pos_sessions(branch_id, estado);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_cajero ON public.pos_sessions(cajero_id, estado);
GRANT SELECT, INSERT, UPDATE ON public.pos_sessions TO authenticated;
GRANT ALL ON public.pos_sessions TO service_role;
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cajero ve su sesion" ON public.pos_sessions FOR SELECT TO authenticated
USING (cajero_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role));
CREATE POLICY "cajero abre sesion" ON public.pos_sessions FOR INSERT TO authenticated
WITH CHECK (cajero_id = auth.uid() AND (public.has_role(auth.uid(),'farmaceutico'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmacia'::app_role) OR public.has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "cajero cierra su sesion" ON public.pos_sessions FOR UPDATE TO authenticated
USING (cajero_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role))
WITH CHECK (cajero_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role));
DROP TRIGGER IF EXISTS trg_pos_sessions_updated ON public.pos_sessions;
CREATE TRIGGER trg_pos_sessions_updated BEFORE UPDATE ON public.pos_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SPRINT 4: POS CUSTOMERS
CREATE TABLE IF NOT EXISTS public.pos_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  email text,
  rfc text,
  uso_cfdi text,
  regimen_fiscal text,
  cp text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pos_customers_tel ON public.pos_customers(telefono);
CREATE INDEX IF NOT EXISTS idx_pos_customers_rfc ON public.pos_customers(rfc);
GRANT SELECT, INSERT, UPDATE ON public.pos_customers TO authenticated;
GRANT ALL ON public.pos_customers TO service_role;
ALTER TABLE public.pos_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "farmacia ve clientes pos" ON public.pos_customers FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role) OR public.has_role(auth.uid(),'farmacia'::app_role));
CREATE POLICY "farmacia inserta clientes pos" ON public.pos_customers FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role) OR public.has_role(auth.uid(),'farmacia'::app_role));
CREATE POLICY "farmacia actualiza clientes pos" ON public.pos_customers FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_farmacia'::app_role) OR public.has_role(auth.uid(),'farmaceutico'::app_role));
DROP TRIGGER IF EXISTS trg_pos_customers_updated ON public.pos_customers;
CREATE TRIGGER trg_pos_customers_updated BEFORE UPDATE ON public.pos_customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TRIGGER: registrar cambios de precio automáticamente
CREATE OR REPLACE FUNCTION public.log_price_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.precio_centavos IS DISTINCT FROM NEW.precio_centavos THEN
    INSERT INTO public.pharmacy_price_history (catalog_id, precio_anterior_centavos, precio_nuevo_centavos, changed_by, motivo)
    VALUES (NEW.id, OLD.precio_centavos, NEW.precio_centavos, auth.uid(), 'Cambio manual');
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_price_change() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_log_price_change ON public.pharmacy_catalog;
CREATE TRIGGER trg_log_price_change AFTER UPDATE ON public.pharmacy_catalog
FOR EACH ROW EXECUTE FUNCTION public.log_price_change();

-- FUNCIONES POS
CREATE OR REPLACE FUNCTION public.pos_open_session(_branch_id uuid, _fondo_inicial integer DEFAULT 0, _notas text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.pos_sessions WHERE cajero_id = auth.uid() AND estado = 'abierta') THEN
    RAISE EXCEPTION 'Ya tienes una sesión de caja abierta';
  END IF;
  INSERT INTO public.pos_sessions (branch_id, cajero_id, fondo_inicial_centavos, notas_apertura)
  VALUES (_branch_id, auth.uid(), COALESCE(_fondo_inicial,0), _notas)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.pos_close_session(_session_id uuid, _fondo_final integer, _notas text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_session public.pos_sessions%ROWTYPE;
  v_efectivo integer := 0;
  v_tarjeta integer := 0;
  v_transferencia integer := 0;
  v_num integer := 0;
  v_esperado integer;
  v_diff integer;
BEGIN
  SELECT * INTO v_session FROM public.pos_sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND OR v_session.estado <> 'abierta' THEN
    RAISE EXCEPTION 'Sesión no encontrada o ya cerrada';
  END IF;
  IF v_session.cajero_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin'::app_role) AND NOT public.has_role(auth.uid(),'admin_farmacia'::app_role) THEN
    RAISE EXCEPTION 'No autorizado a cerrar esta sesión';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN metodo_pago='efectivo' THEN total_centavos ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN metodo_pago='tarjeta' THEN total_centavos ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN metodo_pago='transferencia' THEN total_centavos ELSE 0 END),0),
    COUNT(*)
  INTO v_efectivo, v_tarjeta, v_transferencia, v_num
  FROM public.pharmacy_orders
  WHERE tipo='pos' AND created_by = v_session.cajero_id
    AND branch_id = v_session.branch_id
    AND created_at >= v_session.abierta_at
    AND status = 'pagado';

  v_esperado := v_session.fondo_inicial_centavos + v_efectivo;
  v_diff := COALESCE(_fondo_final, v_esperado) - v_esperado;

  UPDATE public.pos_sessions SET
    fondo_final_centavos = _fondo_final,
    ventas_efectivo_centavos = v_efectivo,
    ventas_tarjeta_centavos = v_tarjeta,
    ventas_transferencia_centavos = v_transferencia,
    total_ventas_centavos = v_efectivo + v_tarjeta + v_transferencia,
    num_ventas = v_num,
    arqueo_diferencia_centavos = v_diff,
    estado = 'cerrada',
    notas_cierre = _notas,
    cerrada_at = now(),
    updated_at = now()
  WHERE id = _session_id;

  RETURN jsonb_build_object(
    'esperado', v_esperado, 'contado', _fondo_final, 'diferencia', v_diff,
    'efectivo', v_efectivo, 'tarjeta', v_tarjeta, 'transferencia', v_transferencia,
    'num_ventas', v_num
  );
END $$;

REVOKE ALL ON FUNCTION public.pos_open_session(uuid,integer,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pos_close_session(uuid,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pos_open_session(uuid,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_close_session(uuid,integer,text) TO authenticated;

-- Catálogo de medicamentos
CREATE TABLE public.pharmacy_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  presentacion TEXT,
  descripcion TEXT,
  precio_centavos INTEGER NOT NULL CHECK (precio_centavos >= 0),
  moneda TEXT NOT NULL DEFAULT 'mxn',
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pharmacy_catalog_activo ON public.pharmacy_catalog(activo);
CREATE INDEX idx_pharmacy_catalog_nombre ON public.pharmacy_catalog(lower(nombre));

ALTER TABLE public.pharmacy_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catálogo visible para autenticados"
  ON public.pharmacy_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/farmacia gestionan catálogo - insert"
  ON public.pharmacy_catalog FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'));

CREATE POLICY "Admin/farmacia gestionan catálogo - update"
  ON public.pharmacy_catalog FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'farmacia'));

CREATE POLICY "Admin gestiona catálogo - delete"
  ON public.pharmacy_catalog FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pharmacy_catalog_updated_at
  BEFORE UPDATE ON public.pharmacy_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Órdenes de farmacia
CREATE TYPE public.pharmacy_order_status AS ENUM ('pendiente_pago', 'pagada', 'surtida', 'cancelada');

CREATE TABLE public.pharmacy_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  created_by UUID NOT NULL,
  receta_id UUID REFERENCES public.recetas(id) ON DELETE SET NULL,
  status public.pharmacy_order_status NOT NULL DEFAULT 'pendiente_pago',
  subtotal_centavos INTEGER NOT NULL DEFAULT 0,
  total_centavos INTEGER NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'mxn',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID,
  notas TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pharmacy_orders_patient ON public.pharmacy_orders(patient_id);
CREATE INDEX idx_pharmacy_orders_status ON public.pharmacy_orders(status);
CREATE INDEX idx_pharmacy_orders_session ON public.pharmacy_orders(stripe_session_id);

ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente ve sus órdenes"
  ON public.pharmacy_orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = patient_id
    OR public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'farmacia') AND public.has_patient_access(auth.uid(), patient_id))
    OR public.has_patient_access(auth.uid(), patient_id)
  );

CREATE POLICY "Paciente o farmacia crea órdenes"
  ON public.pharmacy_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      auth.uid() = patient_id
      OR public.has_role(auth.uid(), 'admin')
      OR (public.has_role(auth.uid(), 'farmacia') AND public.has_patient_access(auth.uid(), patient_id))
    )
  );

CREATE POLICY "Farmacia/admin actualiza órdenes"
  ON public.pharmacy_orders FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (public.has_role(auth.uid(), 'farmacia') AND public.has_patient_access(auth.uid(), patient_id))
  );

CREATE TRIGGER update_pharmacy_orders_updated_at
  BEFORE UPDATE ON public.pharmacy_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Items de la orden
CREATE TABLE public.pharmacy_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
  catalog_id UUID REFERENCES public.pharmacy_catalog(id) ON DELETE SET NULL,
  nombre_snapshot TEXT NOT NULL,
  presentacion_snapshot TEXT,
  precio_unitario_centavos INTEGER NOT NULL CHECK (precio_unitario_centavos >= 0),
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  subtotal_centavos INTEGER NOT NULL CHECK (subtotal_centavos >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pharmacy_order_items_order ON public.pharmacy_order_items(order_id);

ALTER TABLE public.pharmacy_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items siguen visibilidad de la orden - select"
  ON public.pharmacy_order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pharmacy_orders o
      WHERE o.id = order_id AND (
        auth.uid() = o.patient_id
        OR public.has_role(auth.uid(), 'admin')
        OR (public.has_role(auth.uid(), 'farmacia') AND public.has_patient_access(auth.uid(), o.patient_id))
        OR public.has_patient_access(auth.uid(), o.patient_id)
      )
    )
  );

CREATE POLICY "Items siguen visibilidad de la orden - insert"
  ON public.pharmacy_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pharmacy_orders o
      WHERE o.id = order_id AND (
        auth.uid() = o.created_by
      )
    )
  );

CREATE POLICY "Items - delete por dueño u operador"
  ON public.pharmacy_order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pharmacy_orders o
      WHERE o.id = order_id AND (
        auth.uid() = o.created_by
        OR public.has_role(auth.uid(), 'admin')
        OR (public.has_role(auth.uid(), 'farmacia') AND public.has_patient_access(auth.uid(), o.patient_id))
      )
    )
  );

CREATE TABLE public.pharmacy_picking_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.pharmacy_orders(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('start','scan','confirm','revert','scan_reject')),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pharmacy_picking_audit_order ON public.pharmacy_picking_audit(order_id, created_at DESC);
GRANT SELECT, INSERT ON public.pharmacy_picking_audit TO authenticated;
GRANT ALL ON public.pharmacy_picking_audit TO service_role;
ALTER TABLE public.pharmacy_picking_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farmacia_admin_insert_picking_audit" ON public.pharmacy_picking_audit
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'farmacia'::app_role))
  );

CREATE POLICY "farmacia_admin_select_picking_audit" ON public.pharmacy_picking_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'farmacia'::app_role));

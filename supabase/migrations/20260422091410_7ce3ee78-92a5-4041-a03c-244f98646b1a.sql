-- 1. Tabla estudio_items
CREATE TABLE IF NOT EXISTS public.estudio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudio_id uuid NOT NULL REFERENCES public.estudios_solicitados(id) ON DELETE CASCADE,
  orden int NOT NULL DEFAULT 0,
  tipo_estudio text NOT NULL,
  descripcion text,
  cantidad int NOT NULL DEFAULT 1,
  prioridad public.estudio_prioridad NOT NULL DEFAULT 'normal',
  indicacion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estudio_items_estudio_id ON public.estudio_items(estudio_id);

-- 2. Hacer nullable tipo_estudio en estudios_solicitados
ALTER TABLE public.estudios_solicitados ALTER COLUMN tipo_estudio DROP NOT NULL;

-- 3. Backfill: cada estudio existente -> 1 item
INSERT INTO public.estudio_items (
  estudio_id, orden, tipo_estudio, descripcion, cantidad, prioridad, indicacion
)
SELECT
  e.id, 0, COALESCE(e.tipo_estudio, 'Estudio'), e.descripcion,
  COALESCE(e.cantidad, 1), e.prioridad, e.indicacion
FROM public.estudios_solicitados e
WHERE NOT EXISTS (SELECT 1 FROM public.estudio_items i WHERE i.estudio_id = e.id);

-- 4. RLS
ALTER TABLE public.estudio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estudio items view via parent"
ON public.estudio_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.estudios_solicitados e
  WHERE e.id = estudio_items.estudio_id
    AND (
      e.patient_id = auth.uid()
      OR e.doctor_id = auth.uid()
      OR e.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (public.has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM public.broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id
      ))
    )
));

CREATE POLICY "Estudio items insert via parent"
ON public.estudio_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.estudios_solicitados e
  WHERE e.id = estudio_items.estudio_id
    AND (
      e.doctor_id = auth.uid()
      OR e.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (public.has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM public.broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id
      ))
    )
));

CREATE POLICY "Estudio items update via parent"
ON public.estudio_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.estudios_solicitados e
  WHERE e.id = estudio_items.estudio_id
    AND (
      e.doctor_id = auth.uid()
      OR e.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (public.has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM public.broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id
      ))
    )
));

CREATE POLICY "Estudio items delete via parent"
ON public.estudio_items FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.estudios_solicitados e
  WHERE e.id = estudio_items.estudio_id
    AND (
      e.doctor_id = auth.uid()
      OR e.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (public.has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM public.broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id
      ))
    )
));
-- 1. Tabla receta_items
CREATE TABLE IF NOT EXISTS public.receta_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id uuid NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
  orden int NOT NULL DEFAULT 0,
  medicamento_nombre text NOT NULL,
  marca_comercial text,
  es_generico boolean NOT NULL DEFAULT false,
  dosis numeric,
  unidad_dosis text,
  cantidad numeric,
  via_administracion text,
  frecuencia public.receta_frecuencia NOT NULL DEFAULT 'cada_8h',
  frecuencia_horas int,
  dias_a_tomar int,
  precio_aproximado numeric,
  indicacion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receta_items_receta_id ON public.receta_items(receta_id);

-- 2. Hacer nullable medicamento_nombre en recetas (para futuras cabeceras sin legacy)
ALTER TABLE public.recetas ALTER COLUMN medicamento_nombre DROP NOT NULL;

-- 3. Backfill: cada receta existente -> 1 item
INSERT INTO public.receta_items (
  receta_id, orden, medicamento_nombre, marca_comercial, es_generico,
  dosis, unidad_dosis, cantidad, via_administracion, frecuencia,
  frecuencia_horas, dias_a_tomar, precio_aproximado, indicacion
)
SELECT
  r.id, 0, COALESCE(r.medicamento_nombre, 'Medicamento'), r.marca_comercial, COALESCE(r.es_generico, false),
  r.dosis, r.unidad_dosis, r.cantidad, r.via_administracion, r.frecuencia,
  r.frecuencia_horas, r.dias_a_tomar, r.precio_aproximado, r.indicacion
FROM public.recetas r
WHERE NOT EXISTS (SELECT 1 FROM public.receta_items i WHERE i.receta_id = r.id);

-- 4. RLS
ALTER TABLE public.receta_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receta items view via parent"
ON public.receta_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.recetas r
  WHERE r.id = receta_items.receta_id
    AND (
      r.patient_id = auth.uid()
      OR r.doctor_id = auth.uid()
      OR r.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (public.has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM public.broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = r.patient_id
      ))
    )
));

CREATE POLICY "Receta items insert via parent"
ON public.receta_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.recetas r
  WHERE r.id = receta_items.receta_id
    AND (
      r.doctor_id = auth.uid()
      OR r.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (public.has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM public.broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = r.patient_id
      ))
    )
));

CREATE POLICY "Receta items update via parent"
ON public.receta_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.recetas r
  WHERE r.id = receta_items.receta_id
    AND (
      r.doctor_id = auth.uid()
      OR r.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (public.has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM public.broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = r.patient_id
      ))
    )
));

CREATE POLICY "Receta items delete via parent"
ON public.receta_items FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.recetas r
  WHERE r.id = receta_items.receta_id
    AND (
      r.doctor_id = auth.uid()
      OR r.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (public.has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
        SELECT 1 FROM public.broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = r.patient_id
      ))
    )
));
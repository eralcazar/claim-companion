-- ============================================================
-- Nutrition module: metrics + food traffic light
-- ============================================================

-- 1) Nutrition metrics
CREATE TABLE public.nutrition_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  peso_kg numeric(6,2),
  peso_seco_kg numeric(6,2),
  talla_cm numeric(6,2),
  imc numeric(5,2),
  masa_muscular_kg numeric(6,2),
  grasa_corporal_pct numeric(5,2),
  agua_corporal_pct numeric(5,2),
  cintura_cm numeric(6,2),
  cadera_cm numeric(6,2),
  notas text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_metrics ENABLE ROW LEVEL SECURITY;

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_nutrition_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.peso_kg IS NOT NULL AND (NEW.peso_kg < 1 OR NEW.peso_kg > 500) THEN
    RAISE EXCEPTION 'peso_kg fuera de rango (1-500)';
  END IF;
  IF NEW.peso_seco_kg IS NOT NULL AND (NEW.peso_seco_kg < 1 OR NEW.peso_seco_kg > 500) THEN
    RAISE EXCEPTION 'peso_seco_kg fuera de rango (1-500)';
  END IF;
  IF NEW.talla_cm IS NOT NULL AND (NEW.talla_cm < 30 OR NEW.talla_cm > 260) THEN
    RAISE EXCEPTION 'talla_cm fuera de rango (30-260)';
  END IF;
  IF NEW.grasa_corporal_pct IS NOT NULL AND (NEW.grasa_corporal_pct < 0 OR NEW.grasa_corporal_pct > 90) THEN
    RAISE EXCEPTION 'grasa_corporal_pct fuera de rango (0-90)';
  END IF;
  IF NEW.agua_corporal_pct IS NOT NULL AND (NEW.agua_corporal_pct < 0 OR NEW.agua_corporal_pct > 90) THEN
    RAISE EXCEPTION 'agua_corporal_pct fuera de rango (0-90)';
  END IF;
  -- Auto IMC if peso and talla present and imc not provided
  IF NEW.imc IS NULL AND NEW.peso_kg IS NOT NULL AND NEW.talla_cm IS NOT NULL AND NEW.talla_cm > 0 THEN
    NEW.imc := ROUND( (NEW.peso_kg / ((NEW.talla_cm/100.0) * (NEW.talla_cm/100.0)))::numeric, 2 );
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER nutrition_metrics_validate
BEFORE INSERT OR UPDATE ON public.nutrition_metrics
FOR EACH ROW EXECUTE FUNCTION public.validate_nutrition_metrics();

CREATE INDEX idx_nutrition_metrics_patient_date ON public.nutrition_metrics (patient_id, recorded_at DESC);

-- RLS policies (mirror blood_pressure_readings)
CREATE POLICY "Nutri metrics select via access"
ON public.nutrition_metrics FOR SELECT TO authenticated
USING (
  auth.uid() = patient_id
  OR auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_patient_access(auth.uid(), patient_id)
);

CREATE POLICY "Nutri metrics insert by self or personnel"
ON public.nutrition_metrics FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    auth.uid() = patient_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_patient_access(auth.uid(), patient_id)
  )
);

CREATE POLICY "Nutri metrics update by creator or admin"
ON public.nutrition_metrics FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Nutri metrics delete by creator or admin"
ON public.nutrition_metrics FOR DELETE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));


-- 2) Food traffic light (semáforo de alimentos)
CREATE TABLE public.nutrition_food_traffic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid, -- NULL = entrada global del catálogo del nutricionista
  alimento text NOT NULL,
  grupo text,
  color text NOT NULL DEFAULT 'verde', -- verde|amarillo|rojo
  notas text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_food_traffic ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_food_traffic()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.color NOT IN ('verde','amarillo','rojo') THEN
    RAISE EXCEPTION 'color debe ser verde, amarillo o rojo';
  END IF;
  IF length(trim(coalesce(NEW.alimento,''))) = 0 THEN
    RAISE EXCEPTION 'alimento no puede estar vacío';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER food_traffic_validate
BEFORE INSERT OR UPDATE ON public.nutrition_food_traffic
FOR EACH ROW EXECUTE FUNCTION public.validate_food_traffic();

CREATE INDEX idx_food_traffic_patient ON public.nutrition_food_traffic (patient_id, color);
CREATE INDEX idx_food_traffic_global ON public.nutrition_food_traffic (color) WHERE patient_id IS NULL;

-- RLS: global entries visible to all authenticated; patient-specific visible to patient + personnel with access + creator + admin
CREATE POLICY "Food traffic select"
ON public.nutrition_food_traffic FOR SELECT TO authenticated
USING (
  patient_id IS NULL
  OR auth.uid() = patient_id
  OR auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_patient_access(auth.uid(), patient_id)
);

-- Only nutricionista/admin can insert
CREATE POLICY "Food traffic insert by nutri or admin"
ON public.nutrition_food_traffic FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'nutricionista'::app_role)
      AND (patient_id IS NULL OR has_patient_access(auth.uid(), patient_id))
    )
  )
);

CREATE POLICY "Food traffic update by creator or admin"
ON public.nutrition_food_traffic FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Food traffic delete by creator or admin"
ON public.nutrition_food_traffic FOR DELETE TO authenticated
USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role));
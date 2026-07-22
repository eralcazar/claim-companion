-- ============ Catálogo compartido de ingredientes ============
CREATE TABLE IF NOT EXISTS public.nutrition_ingredients_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kcal_100g numeric NOT NULL DEFAULT 0,
  carbs_g numeric NOT NULL DEFAULT 0,
  protein_g numeric NOT NULL DEFAULT 0,
  fat_g numeric NOT NULL DEFAULT 0,
  fiber_g numeric NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS nic_name_uniq ON public.nutrition_ingredients_catalog (lower(name));

GRANT SELECT ON public.nutrition_ingredients_catalog TO authenticated;
GRANT ALL ON public.nutrition_ingredients_catalog TO service_role;
ALTER TABLE public.nutrition_ingredients_catalog ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "read public ingredients" ON public.nutrition_ingredients_catalog
    FOR SELECT TO authenticated USING (is_public = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ Recetas por paciente ============
CREATE TABLE IF NOT EXISTS public.nutrition_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps text,
  servings integer NOT NULL DEFAULT 1 CHECK (servings > 0),
  total_kcal numeric NOT NULL DEFAULT 0,
  total_carbs_g numeric NOT NULL DEFAULT 0,
  total_protein_g numeric NOT NULL DEFAULT 0,
  total_fat_g numeric NOT NULL DEFAULT 0,
  total_fiber_g numeric NOT NULL DEFAULT 0,
  source_type text NOT NULL,
  source_url text,
  source_author text,
  attribution text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_recipes_source_check
    CHECK (source_type IN ('nutriologa','medlineplus','web','libro','manual_paciente'))
);

CREATE INDEX IF NOT EXISTS nr_patient_idx ON public.nutrition_recipes (patient_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_recipes TO authenticated;
GRANT ALL ON public.nutrition_recipes TO service_role;
ALTER TABLE public.nutrition_recipes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own recipes" ON public.nutrition_recipes
    FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "assigned staff read recipes" ON public.nutrition_recipes
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.patient_personnel pp
        WHERE pp.patient_id = nutrition_recipes.patient_id
          AND pp.personnel_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_nutrition_recipes_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_nutrition_recipes ON public.nutrition_recipes;
CREATE TRIGGER trg_touch_nutrition_recipes BEFORE UPDATE ON public.nutrition_recipes
  FOR EACH ROW EXECUTE FUNCTION public.touch_nutrition_recipes_updated_at();

-- ============ Seed ingredientes base (MX) ============
INSERT INTO public.nutrition_ingredients_catalog (name, kcal_100g, carbs_g, protein_g, fat_g, fiber_g) VALUES
  ('Pechuga de pollo cocida', 165, 0, 31, 3.6, 0),
  ('Muslo de pollo cocido', 209, 0, 26, 10.9, 0),
  ('Huevo entero', 155, 1.1, 13, 11, 0),
  ('Clara de huevo', 52, 0.7, 11, 0.2, 0),
  ('Atún en agua', 116, 0, 26, 1, 0),
  ('Salmón cocido', 208, 0, 20, 13, 0),
  ('Carne de res magra', 217, 0, 26, 12, 0),
  ('Bistec de res', 271, 0, 25, 19, 0),
  ('Cerdo lomo', 143, 0, 21, 6, 0),
  ('Frijol negro cocido', 132, 24, 8.9, 0.5, 8.7),
  ('Frijol pinto cocido', 143, 26, 9, 0.7, 9),
  ('Lentejas cocidas', 116, 20, 9, 0.4, 7.9),
  ('Garbanzos cocidos', 164, 27, 8.9, 2.6, 7.6),
  ('Arroz blanco cocido', 130, 28, 2.7, 0.3, 0.4),
  ('Arroz integral cocido', 111, 23, 2.6, 0.9, 1.8),
  ('Pasta cocida', 158, 31, 5.8, 0.9, 1.8),
  ('Tortilla de maíz', 218, 45, 5.7, 2.9, 6.3),
  ('Tortilla de harina', 306, 50, 8, 8, 3),
  ('Pan integral', 247, 41, 13, 3.4, 7),
  ('Avena en hojuelas', 389, 66, 17, 6.9, 10.6),
  ('Papa cocida', 87, 20, 1.9, 0.1, 1.8),
  ('Camote cocido', 76, 17, 1.4, 0.1, 2.5),
  ('Elote', 96, 21, 3.4, 1.5, 2.4),
  ('Nopal cocido', 22, 3.3, 2, 0.1, 2.2),
  ('Jitomate', 18, 3.9, 0.9, 0.2, 1.2),
  ('Cebolla', 40, 9.3, 1.1, 0.1, 1.7),
  ('Chile poblano', 20, 4.7, 0.9, 0.2, 1.8),
  ('Aguacate', 160, 8.5, 2, 14.7, 6.7),
  ('Lechuga romana', 17, 3.3, 1.2, 0.3, 2.1),
  ('Espinaca', 23, 3.6, 2.9, 0.4, 2.2),
  ('Brócoli', 34, 6.6, 2.8, 0.4, 2.6),
  ('Zanahoria', 41, 9.6, 0.9, 0.2, 2.8),
  ('Calabacita', 17, 3.1, 1.2, 0.3, 1),
  ('Manzana', 52, 14, 0.3, 0.2, 2.4),
  ('Plátano', 89, 23, 1.1, 0.3, 2.6),
  ('Papaya', 43, 11, 0.5, 0.3, 1.7),
  ('Piña', 50, 13, 0.5, 0.1, 1.4),
  ('Fresa', 32, 7.7, 0.7, 0.3, 2),
  ('Leche descremada', 34, 5, 3.4, 0.1, 0),
  ('Leche entera', 61, 4.8, 3.2, 3.3, 0),
  ('Yogurt natural bajo en grasa', 63, 7, 5.3, 1.6, 0),
  ('Queso panela', 285, 2.4, 20, 22, 0),
  ('Queso oaxaca', 356, 2.5, 25, 27, 0),
  ('Aceite de oliva', 884, 0, 0, 100, 0),
  ('Aceite vegetal', 884, 0, 0, 100, 0),
  ('Mantequilla', 717, 0.1, 0.9, 81, 0),
  ('Almendras', 579, 22, 21, 50, 12.5),
  ('Nuez', 654, 14, 15, 65, 6.7),
  ('Semillas de chía', 486, 42, 17, 31, 34),
  ('Azúcar', 387, 100, 0, 0, 0),
  ('Miel de abeja', 304, 82, 0.3, 0, 0.2)
ON CONFLICT DO NOTHING;

-- Meal plans
CREATE TABLE public.nutrition_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL DEFAULT 'Plan semanal',
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  kcal_objetivo INTEGER,
  notas TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_meal_plans TO authenticated;
GRANT ALL ON public.nutrition_meal_plans TO service_role;
ALTER TABLE public.nutrition_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente ve su plan" ON public.nutrition_meal_plans FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = professional_id OR auth.uid() = created_by
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'medico'));
CREATE POLICY "Profesional crea plan" ON public.nutrition_meal_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Profesional edita su plan" ON public.nutrition_meal_plans FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = professional_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profesional elimina su plan" ON public.nutrition_meal_plans FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_nmp_updated BEFORE UPDATE ON public.nutrition_meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.nutrition_meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.nutrition_meal_plans(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  momento TEXT NOT NULL CHECK (momento IN ('desayuno','colacion_am','comida','colacion_pm','cena')),
  alimento TEXT NOT NULL,
  porcion TEXT,
  unidad TEXT,
  kcal INTEGER,
  alternativas JSONB NOT NULL DEFAULT '[]'::jsonb,
  orden SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nmpi_plan ON public.nutrition_meal_plan_items(plan_id, dia_semana, momento);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_meal_plan_items TO authenticated;
GRANT ALL ON public.nutrition_meal_plan_items TO service_role;
ALTER TABLE public.nutrition_meal_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ve items del plan visible" ON public.nutrition_meal_plan_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_meal_plans p WHERE p.id = plan_id
    AND (auth.uid() = p.patient_id OR auth.uid() = p.professional_id OR auth.uid() = p.created_by
         OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'medico'))));
CREATE POLICY "Autor gestiona items" ON public.nutrition_meal_plan_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_meal_plans p WHERE p.id = plan_id
    AND (auth.uid() = p.created_by OR auth.uid() = p.professional_id OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.nutrition_meal_plans p WHERE p.id = plan_id
    AND (auth.uid() = p.created_by OR auth.uid() = p.professional_id OR public.has_role(auth.uid(), 'admin'))));

CREATE TRIGGER trg_nmpi_updated BEFORE UPDATE ON public.nutrition_meal_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reminder preference columns
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS remind_appointment_24h BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS remind_appointment_1h BOOLEAN NOT NULL DEFAULT true;

-- Reminder tracking columns on appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ;

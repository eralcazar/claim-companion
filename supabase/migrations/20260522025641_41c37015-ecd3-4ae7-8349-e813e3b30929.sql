
-- ========== medical_history_conditions ==========
CREATE TABLE public.medical_history_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  tipo text NOT NULL,
  nombre text NOT NULL,
  diagnosticado_en date,
  estado text NOT NULL DEFAULT 'activa',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mhc_patient ON public.medical_history_conditions(patient_id);
ALTER TABLE public.medical_history_conditions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_mh_condition()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo NOT IN ('cronica','cirugia','hospitalizacion','otra') THEN
    RAISE EXCEPTION 'tipo inválido: %', NEW.tipo;
  END IF;
  IF NEW.estado NOT IN ('activa','resuelta','en_control') THEN
    RAISE EXCEPTION 'estado inválido: %', NEW.estado;
  END IF;
  IF length(trim(coalesce(NEW.nombre,''))) = 0 THEN
    RAISE EXCEPTION 'nombre no puede estar vacío';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mhc_validate BEFORE INSERT OR UPDATE ON public.medical_history_conditions
  FOR EACH ROW EXECUTE FUNCTION public.validate_mh_condition();

CREATE POLICY "mhc_select" ON public.medical_history_conditions FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));
CREATE POLICY "mhc_insert" ON public.medical_history_conditions FOR INSERT
  WITH CHECK (auth.uid() = created_by AND (auth.uid() = patient_id OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id)));
CREATE POLICY "mhc_update" ON public.medical_history_conditions FOR UPDATE
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));
CREATE POLICY "mhc_delete" ON public.medical_history_conditions FOR DELETE
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));

-- ========== medical_history_family ==========
CREATE TABLE public.medical_history_family (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  parentesco text NOT NULL,
  condicion text NOT NULL,
  edad_diagnostico int,
  vive boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mhf_patient ON public.medical_history_family(patient_id);
ALTER TABLE public.medical_history_family ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_mh_family()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.parentesco NOT IN ('padre','madre','hermano','hermana','abuelo_paterno','abuela_paterna','abuelo_materno','abuela_materna','tio','tia','otro') THEN
    RAISE EXCEPTION 'parentesco inválido: %', NEW.parentesco;
  END IF;
  IF length(trim(coalesce(NEW.condicion,''))) = 0 THEN
    RAISE EXCEPTION 'condicion no puede estar vacía';
  END IF;
  IF NEW.edad_diagnostico IS NOT NULL AND (NEW.edad_diagnostico < 0 OR NEW.edad_diagnostico > 130) THEN
    RAISE EXCEPTION 'edad_diagnostico fuera de rango';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mhf_validate BEFORE INSERT OR UPDATE ON public.medical_history_family
  FOR EACH ROW EXECUTE FUNCTION public.validate_mh_family();

CREATE POLICY "mhf_select" ON public.medical_history_family FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));
CREATE POLICY "mhf_insert" ON public.medical_history_family FOR INSERT
  WITH CHECK (auth.uid() = created_by AND (auth.uid() = patient_id OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id)));
CREATE POLICY "mhf_update" ON public.medical_history_family FOR UPDATE
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));
CREATE POLICY "mhf_delete" ON public.medical_history_family FOR DELETE
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));

-- ========== medical_history_allergies ==========
CREATE TABLE public.medical_history_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  sustancia text NOT NULL,
  tipo text NOT NULL,
  severidad text NOT NULL DEFAULT 'leve',
  reaccion text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mha_patient ON public.medical_history_allergies(patient_id);
ALTER TABLE public.medical_history_allergies ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_mh_allergy()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tipo NOT IN ('medicamento','alimento','ambiental','otro') THEN
    RAISE EXCEPTION 'tipo inválido: %', NEW.tipo;
  END IF;
  IF NEW.severidad NOT IN ('leve','moderada','severa','anafilaxia') THEN
    RAISE EXCEPTION 'severidad inválida: %', NEW.severidad;
  END IF;
  IF length(trim(coalesce(NEW.sustancia,''))) = 0 THEN
    RAISE EXCEPTION 'sustancia no puede estar vacía';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mha_validate BEFORE INSERT OR UPDATE ON public.medical_history_allergies
  FOR EACH ROW EXECUTE FUNCTION public.validate_mh_allergy();

CREATE POLICY "mha_select" ON public.medical_history_allergies FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));
CREATE POLICY "mha_insert" ON public.medical_history_allergies FOR INSERT
  WITH CHECK (auth.uid() = created_by AND (auth.uid() = patient_id OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id)));
CREATE POLICY "mha_update" ON public.medical_history_allergies FOR UPDATE
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));
CREATE POLICY "mha_delete" ON public.medical_history_allergies FOR DELETE
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));

-- ========== medical_history_lifestyle ==========
CREATE TABLE public.medical_history_lifestyle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  tabaco text NOT NULL DEFAULT 'nunca',
  tabaco_cantidad_dia int,
  alcohol text NOT NULL DEFAULT 'nunca',
  alcohol_unidades_semana int,
  ejercicio text NOT NULL DEFAULT 'sedentario',
  ejercicio_minutos_semana int,
  vacunas jsonb NOT NULL DEFAULT '[]'::jsonb,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_history_lifestyle ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_mh_lifestyle()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tabaco NOT IN ('nunca','exfumador','activo') THEN
    RAISE EXCEPTION 'tabaco inválido: %', NEW.tabaco;
  END IF;
  IF NEW.alcohol NOT IN ('nunca','ocasional','frecuente') THEN
    RAISE EXCEPTION 'alcohol inválido: %', NEW.alcohol;
  END IF;
  IF NEW.ejercicio NOT IN ('sedentario','ligero','moderado','intenso') THEN
    RAISE EXCEPTION 'ejercicio inválido: %', NEW.ejercicio;
  END IF;
  IF NEW.tabaco_cantidad_dia IS NOT NULL AND NEW.tabaco_cantidad_dia < 0 THEN
    RAISE EXCEPTION 'tabaco_cantidad_dia debe ser >= 0';
  END IF;
  IF NEW.alcohol_unidades_semana IS NOT NULL AND NEW.alcohol_unidades_semana < 0 THEN
    RAISE EXCEPTION 'alcohol_unidades_semana debe ser >= 0';
  END IF;
  IF NEW.ejercicio_minutos_semana IS NOT NULL AND (NEW.ejercicio_minutos_semana < 0 OR NEW.ejercicio_minutos_semana > 10080) THEN
    RAISE EXCEPTION 'ejercicio_minutos_semana fuera de rango (0-10080)';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mhl_validate BEFORE INSERT OR UPDATE ON public.medical_history_lifestyle
  FOR EACH ROW EXECUTE FUNCTION public.validate_mh_lifestyle();

CREATE POLICY "mhl_select" ON public.medical_history_lifestyle FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));
CREATE POLICY "mhl_insert" ON public.medical_history_lifestyle FOR INSERT
  WITH CHECK (auth.uid() = created_by AND (auth.uid() = patient_id OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id)));
CREATE POLICY "mhl_update" ON public.medical_history_lifestyle FOR UPDATE
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));
CREATE POLICY "mhl_delete" ON public.medical_history_lifestyle FOR DELETE
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR has_role(auth.uid(),'admin') OR has_patient_access(auth.uid(), patient_id));

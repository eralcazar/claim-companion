
-- =====================================================
-- FASE 1: Historial, cirugías, alertas, audit logs
-- =====================================================

-- ----------- 1.1 Mapa corporal versionado -----------
ALTER TABLE public.body_annotations
  ADD COLUMN IF NOT EXISTS is_vigente boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.body_annotations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_body_annotations_vigente
  ON public.body_annotations(patient_id, is_vigente) WHERE is_vigente = true;

-- Permitir al paciente insertar/editar/borrar sus propias anotaciones
DROP POLICY IF EXISTS "BodyAnn patient self insert" ON public.body_annotations;
CREATE POLICY "BodyAnn patient self insert" ON public.body_annotations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND auth.uid() = patient_id);

DROP POLICY IF EXISTS "BodyAnn patient self update" ON public.body_annotations;
CREATE POLICY "BodyAnn patient self update" ON public.body_annotations
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by AND auth.uid() = patient_id);

-- ----------- 1.2 Cirugías -----------
CREATE TABLE IF NOT EXISTS public.surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  fecha date NOT NULL,
  nombre text NOT NULL,
  hospital text,
  cirujano text,
  tipo_anestesia text,
  complicaciones text,
  notas text,
  vigente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_surgeries_patient ON public.surgeries(patient_id);
ALTER TABLE public.surgeries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surgeries select" ON public.surgeries FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "Surgeries insert" ON public.surgeries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (auth.uid() = patient_id OR public.has_patient_access(auth.uid(), patient_id)));
CREATE POLICY "Surgeries update own" ON public.surgeries FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = patient_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Surgeries delete own" ON public.surgeries FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = patient_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_surgeries_updated_at BEFORE UPDATE ON public.surgeries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------- 1.2b Procedimientos puntuales -----------
CREATE TABLE IF NOT EXISTS public.procedures_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  fecha date NOT NULL,
  nombre text NOT NULL,
  tipo text,
  lugar text,
  profesional text,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_procedures_log_patient ON public.procedures_log(patient_id);
ALTER TABLE public.procedures_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Procedures select" ON public.procedures_log FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "Procedures insert" ON public.procedures_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (auth.uid() = patient_id OR public.has_patient_access(auth.uid(), patient_id)));
CREATE POLICY "Procedures update own" ON public.procedures_log FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = patient_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Procedures delete own" ON public.procedures_log FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR auth.uid() = patient_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_procedures_log_updated_at BEFORE UPDATE ON public.procedures_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------- 1.3 Alertas médicas -----------
CREATE TABLE IF NOT EXISTS public.medical_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  tipo text NOT NULL,
  severidad text NOT NULL DEFAULT 'info' CHECK (severidad IN ('info','warning','critical')),
  titulo text NOT NULL,
  mensaje text,
  ref_table text,
  ref_id uuid,
  activa boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medical_alerts_patient_active
  ON public.medical_alerts(patient_id, activa) WHERE activa = true;
ALTER TABLE public.medical_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alerts select" ON public.medical_alerts FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = created_by OR public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "Alerts insert" ON public.medical_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND (auth.uid() = patient_id OR public.has_patient_access(auth.uid(), patient_id)));
CREATE POLICY "Alerts update own" ON public.medical_alerts FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_patient_access(auth.uid(), patient_id) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Alerts delete own" ON public.medical_alerts FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_medical_alerts_updated_at BEFORE UPDATE ON public.medical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------- 1.4 Audit logs universal -----------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  patient_id uuid,
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  before jsonb,
  after jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_patient ON public.audit_logs(patient_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(table_name, record_id, at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs patient view" ON public.audit_logs FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = actor_id OR public.has_role(auth.uid(), 'admin') OR (patient_id IS NOT NULL AND public.has_patient_access(auth.uid(), patient_id)));

CREATE OR REPLACE FUNCTION public.log_clinical_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient uuid;
  v_record uuid;
BEGIN
  -- Detectar patient_id desde NEW u OLD (la mayoría de tablas clínicas tienen patient_id)
  IF TG_OP = 'DELETE' THEN
    v_record := OLD.id;
    BEGIN v_patient := (to_jsonb(OLD)->>'patient_id')::uuid; EXCEPTION WHEN OTHERS THEN v_patient := NULL; END;
  ELSE
    v_record := NEW.id;
    BEGIN v_patient := (to_jsonb(NEW)->>'patient_id')::uuid; EXCEPTION WHEN OTHERS THEN v_patient := NULL; END;
  END IF;

  INSERT INTO public.audit_logs (actor_id, patient_id, table_name, record_id, action, before, after)
  VALUES (
    auth.uid(),
    v_patient,
    TG_TABLE_NAME,
    v_record,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Helper para crear triggers de auditoría sin duplicar nombres
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'body_annotations','recetas','receta_items','estudios','blood_pressure_readings',
    'oxygen_saturation_readings','temperature_readings','glucose_readings',
    'medical_alerts','surgeries','procedures_log',
    'mh_conditions','mh_allergies','mh_family','mh_lifestyle','medications'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_clinical_change()', t, t);
    END IF;
  END LOOP;
END $$;

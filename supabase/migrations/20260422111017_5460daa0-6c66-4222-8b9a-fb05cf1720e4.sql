-- ============================================
-- patient_personnel table
-- ============================================
CREATE TABLE IF NOT EXISTS public.patient_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  personnel_id uuid NOT NULL,
  personnel_role public.app_role NOT NULL,
  granted_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, personnel_id, personnel_role)
);

CREATE INDEX IF NOT EXISTS idx_patient_personnel_patient ON public.patient_personnel(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_personnel_personnel ON public.patient_personnel(personnel_id);
CREATE INDEX IF NOT EXISTS idx_patient_personnel_role ON public.patient_personnel(personnel_role);

ALTER TABLE public.patient_personnel ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins manage all patient_personnel"
ON public.patient_personnel FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients view own personnel links"
ON public.patient_personnel FOR SELECT TO authenticated
USING (auth.uid() = patient_id);

CREATE POLICY "Patients grant own personnel access"
ON public.patient_personnel FOR INSERT TO authenticated
WITH CHECK (auth.uid() = patient_id AND granted_by = auth.uid());

CREATE POLICY "Patients revoke own personnel access"
ON public.patient_personnel FOR DELETE TO authenticated
USING (auth.uid() = patient_id);

CREATE POLICY "Personnel view own patient links"
ON public.patient_personnel FOR SELECT TO authenticated
USING (auth.uid() = personnel_id);

-- ============================================
-- has_patient_access security definer function
-- ============================================
CREATE OR REPLACE FUNCTION public.has_patient_access(_personnel uuid, _patient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _personnel = _patient
    OR public.has_role(_personnel, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.patient_personnel pp
      WHERE pp.patient_id = _patient AND pp.personnel_id = _personnel
    )
    OR EXISTS (
      SELECT 1 FROM public.broker_patients bp
      WHERE bp.broker_id = _personnel AND bp.patient_id = _patient
    );
$$;

-- ============================================
-- Extend medicos table with consultorio info
-- ============================================
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS nombre_consultorio text,
  ADD COLUMN IF NOT EXISTS consultorio_calle text,
  ADD COLUMN IF NOT EXISTS consultorio_numero text,
  ADD COLUMN IF NOT EXISTS consultorio_colonia text,
  ADD COLUMN IF NOT EXISTS consultorio_cp text,
  ADD COLUMN IF NOT EXISTS consultorio_municipio text,
  ADD COLUMN IF NOT EXISTS consultorio_estado text,
  ADD COLUMN IF NOT EXISTS email_consultorio text,
  ADD COLUMN IF NOT EXISTS horario_atencion text,
  ADD COLUMN IF NOT EXISTS foto_path text;

-- ============================================
-- formularios.es_informe_medico
-- ============================================
ALTER TABLE public.formularios
  ADD COLUMN IF NOT EXISTS es_informe_medico boolean NOT NULL DEFAULT false;

-- Partial unique index: only one es_informe_medico=true per aseguradora
CREATE UNIQUE INDEX IF NOT EXISTS uniq_informe_medico_per_aseguradora
  ON public.formularios(aseguradora_id)
  WHERE es_informe_medico = true;

-- ============================================
-- claim_documents.tipo_documento
-- ============================================
ALTER TABLE public.claim_documents
  ADD COLUMN IF NOT EXISTS tipo_documento text NOT NULL DEFAULT 'otro';

-- ============================================
-- Extend RLS for clinical tables to include patient_personnel access
-- ============================================

-- appointments
CREATE POLICY "Personnel view appts via access"
ON public.appointments FOR SELECT TO authenticated
USING (public.has_patient_access(auth.uid(), user_id));

-- medications
CREATE POLICY "Personnel view meds via access"
ON public.medications FOR SELECT TO authenticated
USING (public.has_patient_access(auth.uid(), user_id));

CREATE POLICY "Nurses insert meds for assigned"
ON public.medications FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'enfermero')
  AND public.has_patient_access(auth.uid(), user_id)
);

CREATE POLICY "Nurses update meds for assigned"
ON public.medications FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'enfermero')
  AND public.has_patient_access(auth.uid(), user_id)
);

-- medical_records
CREATE POLICY "Personnel view records via access"
ON public.medical_records FOR SELECT TO authenticated
USING (public.has_patient_access(auth.uid(), user_id));

CREATE POLICY "Nurses insert records for assigned"
ON public.medical_records FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'enfermero')
  AND public.has_patient_access(auth.uid(), user_id)
);

-- estudios_solicitados
CREATE POLICY "Personnel view estudios via access"
ON public.estudios_solicitados FOR SELECT TO authenticated
USING (public.has_patient_access(auth.uid(), patient_id));

-- resultados_estudios
CREATE POLICY "Personnel view resultados via access"
ON public.resultados_estudios FOR SELECT TO authenticated
USING (public.has_patient_access(auth.uid(), patient_id));

CREATE POLICY "Lab inserts resultados for assigned"
ON public.resultados_estudios FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'laboratorio')
  AND public.has_patient_access(auth.uid(), patient_id)
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Lab updates resultados for assigned"
ON public.resultados_estudios FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'laboratorio')
  AND public.has_patient_access(auth.uid(), patient_id)
);

CREATE POLICY "Lab updates estudio status for assigned"
ON public.estudios_solicitados FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'laboratorio')
  AND public.has_patient_access(auth.uid(), patient_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'laboratorio')
  AND public.has_patient_access(auth.uid(), patient_id)
);

-- indicadores_estudio
CREATE POLICY "Personnel view indicadores via access"
ON public.indicadores_estudio FOR SELECT TO authenticated
USING (public.has_patient_access(auth.uid(), patient_id));

CREATE POLICY "Lab inserts indicadores for assigned"
ON public.indicadores_estudio FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'laboratorio')
  AND public.has_patient_access(auth.uid(), patient_id)
);

-- recetas
CREATE POLICY "Personnel view recetas via access"
ON public.recetas FOR SELECT TO authenticated
USING (public.has_patient_access(auth.uid(), patient_id));

CREATE POLICY "Pharmacy updates receta status for assigned"
ON public.recetas FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'farmacia')
  AND public.has_patient_access(auth.uid(), patient_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'farmacia')
  AND public.has_patient_access(auth.uid(), patient_id)
);

-- receta_items
CREATE POLICY "Personnel view receta_items via access"
ON public.receta_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.recetas r
    WHERE r.id = receta_items.receta_id
      AND public.has_patient_access(auth.uid(), r.patient_id)
  )
);

-- estudio_items
CREATE POLICY "Personnel view estudio_items via access"
ON public.estudio_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.estudios_solicitados e
    WHERE e.id = estudio_items.estudio_id
      AND public.has_patient_access(auth.uid(), e.patient_id)
  )
);

-- ============================================
-- Storage policies for medico photos in 'medicos' bucket
-- ============================================
CREATE POLICY "Medicos upload own photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medicos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Medicos update own photo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'medicos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Medicos read own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'medicos'
  AND ((storage.foldername(name))[1] = auth.uid()::text
       OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Medicos delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'medicos'
  AND ((storage.foldername(name))[1] = auth.uid()::text
       OR public.has_role(auth.uid(), 'admin'))
);
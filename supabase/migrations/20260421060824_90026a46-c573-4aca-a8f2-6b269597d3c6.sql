-- ENUMS
CREATE TYPE public.receta_frecuencia AS ENUM ('cada_4h','cada_6h','cada_8h','cada_12h','cada_24h','cada_48h','semanal','otro');
CREATE TYPE public.receta_estado AS ENUM ('activa','completada','cancelada');
CREATE TYPE public.estudio_prioridad AS ENUM ('baja','normal','urgente');
CREATE TYPE public.estudio_estado AS ENUM ('solicitado','en_proceso','completado','cancelado');

-- TABLE: recetas
CREATE TABLE public.recetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  created_by uuid NOT NULL,
  medicamento_nombre text NOT NULL,
  dosis numeric,
  unidad_dosis text,
  cantidad integer,
  via_administracion text,
  dias_a_tomar integer,
  frecuencia public.receta_frecuencia NOT NULL DEFAULT 'cada_8h',
  frecuencia_horas integer,
  indicacion text,
  observaciones text,
  marca_comercial text,
  es_generico boolean NOT NULL DEFAULT false,
  precio_aproximado numeric,
  estado public.receta_estado NOT NULL DEFAULT 'activa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_recetas_patient ON public.recetas(patient_id);
CREATE INDEX idx_recetas_doctor ON public.recetas(doctor_id);
CREATE INDEX idx_recetas_appt ON public.recetas(appointment_id);

CREATE POLICY "Recetas patient view" ON public.recetas FOR SELECT TO authenticated USING (auth.uid() = patient_id);
CREATE POLICY "Recetas doctor view" ON public.recetas FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Recetas admin view" ON public.recetas FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Recetas broker view" ON public.recetas FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = recetas.patient_id)
);
CREATE POLICY "Recetas doctor insert" ON public.recetas FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id AND public.has_role(auth.uid(),'medico'));
CREATE POLICY "Recetas admin insert" ON public.recetas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Recetas broker insert" ON public.recetas FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = recetas.patient_id)
);
CREATE POLICY "Recetas doctor update" ON public.recetas FOR UPDATE TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Recetas admin update" ON public.recetas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Recetas broker update" ON public.recetas FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = recetas.patient_id)
);
CREATE POLICY "Recetas admin delete" ON public.recetas FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Recetas creator delete" ON public.recetas FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TRIGGER update_recetas_updated_at BEFORE UPDATE ON public.recetas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TABLE: estudios_solicitados
CREATE TABLE public.estudios_solicitados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  created_by uuid NOT NULL,
  tipo_estudio text NOT NULL,
  descripcion text,
  cantidad integer NOT NULL DEFAULT 1,
  indicacion text,
  observaciones text,
  preparacion text,
  laboratorio_sugerido text,
  prioridad public.estudio_prioridad NOT NULL DEFAULT 'normal',
  ayuno_obligatorio boolean NOT NULL DEFAULT false,
  horas_ayuno integer,
  estado public.estudio_estado NOT NULL DEFAULT 'solicitado',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.estudios_solicitados ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_estudios_patient ON public.estudios_solicitados(patient_id);
CREATE INDEX idx_estudios_doctor ON public.estudios_solicitados(doctor_id);
CREATE INDEX idx_estudios_appt ON public.estudios_solicitados(appointment_id);

CREATE POLICY "Estudios patient view" ON public.estudios_solicitados FOR SELECT TO authenticated USING (auth.uid() = patient_id);
CREATE POLICY "Estudios doctor view" ON public.estudios_solicitados FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Estudios admin view" ON public.estudios_solicitados FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Estudios broker view" ON public.estudios_solicitados FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = estudios_solicitados.patient_id)
);
CREATE POLICY "Estudios doctor insert" ON public.estudios_solicitados FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id AND public.has_role(auth.uid(),'medico'));
CREATE POLICY "Estudios admin insert" ON public.estudios_solicitados FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Estudios broker insert" ON public.estudios_solicitados FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = estudios_solicitados.patient_id)
);
CREATE POLICY "Estudios doctor update" ON public.estudios_solicitados FOR UPDATE TO authenticated USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Estudios admin update" ON public.estudios_solicitados FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Estudios broker update" ON public.estudios_solicitados FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = estudios_solicitados.patient_id)
);
CREATE POLICY "Estudios admin delete" ON public.estudios_solicitados FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Estudios creator delete" ON public.estudios_solicitados FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TRIGGER update_estudios_updated_at BEFORE UPDATE ON public.estudios_solicitados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TABLE: resultados_estudios
CREATE TABLE public.resultados_estudios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudio_id uuid NOT NULL REFERENCES public.estudios_solicitados(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  pdf_path text NOT NULL,
  pdf_name text NOT NULL DEFAULT '',
  fecha_resultado date,
  laboratorio_nombre text,
  notas text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.resultados_estudios ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_resultados_estudio ON public.resultados_estudios(estudio_id);

CREATE POLICY "Resultados view via estudio" ON public.resultados_estudios FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.estudios_solicitados e WHERE e.id = resultados_estudios.estudio_id AND (
    e.patient_id = auth.uid() OR e.doctor_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id))
  ))
);
CREATE POLICY "Resultados insert via estudio" ON public.resultados_estudios FOR INSERT TO authenticated WITH CHECK (
  uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.estudios_solicitados e WHERE e.id = resultados_estudios.estudio_id AND (
    e.doctor_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id))
  ))
);
CREATE POLICY "Resultados delete admin or uploader" ON public.resultados_estudios FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin') OR uploaded_by = auth.uid()
);
CREATE POLICY "Resultados update via estudio" ON public.resultados_estudios FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.estudios_solicitados e WHERE e.id = resultados_estudios.estudio_id AND (
    e.doctor_id = auth.uid() OR public.has_role(auth.uid(),'admin')
  ))
);

-- TABLE: indicadores_estudio
CREATE TABLE public.indicadores_estudio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resultado_id uuid NOT NULL REFERENCES public.resultados_estudios(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  nombre_indicador text NOT NULL,
  codigo_indicador text,
  valor numeric,
  unidad text,
  valor_referencia_min numeric,
  valor_referencia_max numeric,
  es_normal boolean,
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.indicadores_estudio ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_indicadores_resultado ON public.indicadores_estudio(resultado_id);
CREATE INDEX idx_indicadores_patient ON public.indicadores_estudio(patient_id);

CREATE POLICY "Indicadores view via resultado" ON public.indicadores_estudio FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.resultados_estudios r JOIN public.estudios_solicitados e ON e.id = r.estudio_id
    WHERE r.id = indicadores_estudio.resultado_id AND (
      e.patient_id = auth.uid() OR e.doctor_id = auth.uid() OR public.has_role(auth.uid(),'admin')
      OR (public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id))
    ))
);
CREATE POLICY "Indicadores insert via resultado" ON public.indicadores_estudio FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.resultados_estudios r JOIN public.estudios_solicitados e ON e.id = r.estudio_id
    WHERE r.id = indicadores_estudio.resultado_id AND (
      e.doctor_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    ))
);
CREATE POLICY "Indicadores update via resultado" ON public.indicadores_estudio FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.resultados_estudios r JOIN public.estudios_solicitados e ON e.id = r.estudio_id
    WHERE r.id = indicadores_estudio.resultado_id AND (
      e.doctor_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    ))
);
CREATE POLICY "Indicadores delete via resultado" ON public.indicadores_estudio FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.resultados_estudios r JOIN public.estudios_solicitados e ON e.id = r.estudio_id
    WHERE r.id = indicadores_estudio.resultado_id AND (
      e.doctor_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    ))
);

-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('estudios-resultados','estudios-resultados', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Estudios storage view" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'estudios-resultados' AND (
    public.has_role(auth.uid(),'admin')
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.estudios_solicitados e WHERE e.id::text = (storage.foldername(name))[2] AND (
      e.doctor_id = auth.uid()
      OR (public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id))
    ))
  )
);
CREATE POLICY "Estudios storage insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'estudios-resultados' AND (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.estudios_solicitados e WHERE e.id::text = (storage.foldername(name))[2] AND (
      e.doctor_id = auth.uid()
      OR (public.has_role(auth.uid(),'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id))
    ))
  )
);
CREATE POLICY "Estudios storage delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'estudios-resultados' AND (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.estudios_solicitados e WHERE e.id::text = (storage.foldername(name))[2] AND e.doctor_id = auth.uid())
  )
);

-- ROLE PERMISSIONS
INSERT INTO public.role_permissions (role, feature_key, allowed) VALUES
  ('admin','recetas',true),('admin','estudios',true),
  ('medico','recetas',true),('medico','estudios',true),
  ('broker','recetas',true),('broker','estudios',true),
  ('paciente','recetas',true),('paciente','estudios',true)
ON CONFLICT (role, feature_key) DO UPDATE SET allowed = true;
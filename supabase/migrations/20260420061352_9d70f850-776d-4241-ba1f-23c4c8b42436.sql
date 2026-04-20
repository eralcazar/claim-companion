-- ============================================================
-- 1. STORAGE POLICIES for bucket 'formatos' (admins manage)
-- ============================================================
CREATE POLICY "Admins insert formatos objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'formatos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update formatos objects"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'formatos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'formatos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete formatos objects"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'formatos' AND public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. MEDICOS CATALOG
-- ============================================================
CREATE TABLE public.especialidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read especialidades"
ON public.especialidades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage especialidades"
ON public.especialidades FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.medicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  cedula_general text,
  telefono_consultorio text,
  direccion_consultorio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicos view own"
ON public.medicos FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Medicos insert own"
ON public.medicos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Medicos update own"
ON public.medicos FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage medicos"
ON public.medicos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_medicos_updated_at
BEFORE UPDATE ON public.medicos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.medico_especialidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  especialidad_id uuid NOT NULL REFERENCES public.especialidades(id) ON DELETE CASCADE,
  cedula_especialidad text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (medico_id, especialidad_id)
);
ALTER TABLE public.medico_especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico view own especialidades"
ON public.medico_especialidades FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_especialidades.medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Medico manage own especialidades"
ON public.medico_especialidades FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_especialidades.medico_id AND m.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_especialidades.medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Admins manage medico_especialidades"
ON public.medico_especialidades FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.medico_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('ine','cedula_general','cedula_especialidad')),
  especialidad_id uuid REFERENCES public.especialidades(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medico_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico view own documentos"
ON public.medico_documentos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_documentos.medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Medico manage own documentos"
ON public.medico_documentos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_documentos.medico_id AND m.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_documentos.medico_id AND m.user_id = auth.uid()));

CREATE POLICY "Admins manage medico_documentos"
ON public.medico_documentos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Bucket privado para documentos de médicos
INSERT INTO storage.buckets (id, name, public) VALUES ('medicos', 'medicos', false)
ON CONFLICT (id) DO NOTHING;

-- Estructura de paths: <user_id>/<filename>
CREATE POLICY "Medico read own files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medicos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Medico upload own files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'medicos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Medico update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'medicos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Medico delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'medicos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins read all medicos files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'medicos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage all medicos files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'medicos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'medicos' AND public.has_role(auth.uid(), 'admin'));

-- Seed de especialidades comunes
INSERT INTO public.especialidades (nombre) VALUES
  ('Medicina General'),
  ('Pediatría'),
  ('Ginecología'),
  ('Cardiología'),
  ('Traumatología y Ortopedia'),
  ('Cirugía General'),
  ('Oftalmología'),
  ('Otorrinolaringología'),
  ('Dermatología'),
  ('Neurología'),
  ('Psiquiatría'),
  ('Anestesiología'),
  ('Radiología'),
  ('Urología')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 3. MAPEO MEDICOS + columna en campos
-- ============================================================
CREATE TABLE public.mapeo_medicos (
  id text PRIMARY KEY,
  nombre_display text NOT NULL,
  columna_origen text NOT NULL,
  tipo text NOT NULL DEFAULT 'texto'
);
ALTER TABLE public.mapeo_medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read mapeo_medicos"
ON public.mapeo_medicos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage mapeo_medicos"
ON public.mapeo_medicos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.mapeo_medicos (id, nombre_display, columna_origen, tipo) VALUES
  ('med_cedula_general',     'Cédula general',         'cedula_general',         'texto'),
  ('med_nombre_completo',    'Nombre completo',        'nombre_completo',        'texto'),
  ('med_telefono',           'Teléfono consultorio',   'telefono_consultorio',   'telefono'),
  ('med_direccion',          'Dirección consultorio',  'direccion_consultorio',  'texto'),
  ('med_especialidad',       'Especialidad principal', 'especialidad_principal', 'texto'),
  ('med_cedula_esp',         'Cédula por especialidad','cedula_especialidad',    'texto');

-- Columna en campos + FK al catálogo
ALTER TABLE public.campos
  ADD COLUMN mapeo_medico text REFERENCES public.mapeo_medicos(id) ON DELETE SET NULL;
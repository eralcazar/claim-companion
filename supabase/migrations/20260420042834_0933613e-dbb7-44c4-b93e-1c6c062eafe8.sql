
-- =========================================================
-- Catálogos: mapeo a tablas reales (profiles / insurance_policies / claims)
-- =========================================================
CREATE TABLE public.mapeo_perfiles (
  id text PRIMARY KEY,
  nombre_display text NOT NULL,
  columna_origen text NOT NULL,
  tipo text NOT NULL DEFAULT 'texto'
);

CREATE TABLE public.mapeo_polizas (
  id text PRIMARY KEY,
  nombre_display text NOT NULL,
  columna_origen text NOT NULL,
  tipo text NOT NULL DEFAULT 'texto'
);

CREATE TABLE public.mapeo_siniestros (
  id text PRIMARY KEY,
  nombre_display text NOT NULL,
  columna_origen text NOT NULL,
  tipo text NOT NULL DEFAULT 'texto'
);

-- =========================================================
-- Aseguradoras
-- =========================================================
CREATE TABLE public.aseguradoras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  carpeta_storage text NOT NULL,
  color_primario text NOT NULL DEFAULT '#3B82F6',
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- Formularios
-- =========================================================
CREATE TABLE public.formularios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aseguradora_id uuid NOT NULL REFERENCES public.aseguradoras(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  nombre_display text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  total_paginas int NOT NULL DEFAULT 1,
  total_campos_estimado int NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aseguradora_id, nombre)
);
CREATE INDEX idx_formularios_aseguradora ON public.formularios(aseguradora_id);

-- =========================================================
-- Secciones
-- =========================================================
CREATE TABLE public.secciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  pagina int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_secciones_formulario ON public.secciones(formulario_id);

-- =========================================================
-- Campos (con coordenadas en porcentajes)
-- =========================================================
CREATE TABLE public.campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  seccion_id uuid REFERENCES public.secciones(id) ON DELETE SET NULL,
  clave text NOT NULL,
  etiqueta text,
  descripcion text,
  origen text NOT NULL DEFAULT 'auto' CHECK (origen IN ('auto','manual')),
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN (
    'texto','numero','fecha','checkbox','radio','select',
    'firma','textarea','telefono','curp','rfc','diagnostico_cie'
  )),
  label_pagina int,
  label_x float,
  label_y float,
  label_ancho float,
  label_alto float,
  campo_pagina int,
  campo_x float,
  campo_y float,
  campo_ancho float,
  campo_alto float,
  mapeo_perfil text REFERENCES public.mapeo_perfiles(id) ON DELETE SET NULL,
  mapeo_poliza text REFERENCES public.mapeo_polizas(id) ON DELETE SET NULL,
  mapeo_siniestro text REFERENCES public.mapeo_siniestros(id) ON DELETE SET NULL,
  requerido boolean NOT NULL DEFAULT false,
  longitud_max int,
  patron_validacion text,
  valor_defecto text,
  opciones jsonb,
  orden int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (formulario_id, clave)
);
CREATE INDEX idx_campos_formulario ON public.campos(formulario_id);
CREATE INDEX idx_campos_seccion ON public.campos(seccion_id);

-- =========================================================
-- Triggers updated_at
-- =========================================================
CREATE TRIGGER trg_formularios_updated
  BEFORE UPDATE ON public.formularios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_campos_updated
  BEFORE UPDATE ON public.campos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE public.aseguradoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapeo_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapeo_polizas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapeo_siniestros ENABLE ROW LEVEL SECURITY;

-- Lectura abierta a authenticated
CREATE POLICY "Authenticated can read aseguradoras" ON public.aseguradoras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read formularios" ON public.formularios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read secciones" ON public.secciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read campos" ON public.campos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read mapeo_perfiles" ON public.mapeo_perfiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read mapeo_polizas" ON public.mapeo_polizas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read mapeo_siniestros" ON public.mapeo_siniestros FOR SELECT TO authenticated USING (true);

-- Solo admin para escritura
CREATE POLICY "Admins manage aseguradoras" ON public.aseguradoras FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage formularios" ON public.formularios FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage secciones" ON public.secciones FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage campos" ON public.campos FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage mapeo_perfiles" ON public.mapeo_perfiles FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage mapeo_polizas" ON public.mapeo_polizas FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage mapeo_siniestros" ON public.mapeo_siniestros FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- =========================================================
-- SEED: mapeo_perfiles
-- =========================================================
INSERT INTO public.mapeo_perfiles (id, nombre_display, columna_origen, tipo) VALUES
  ('NOMBRE_COMPLETO', 'Nombre completo', 'full_name', 'texto'),
  ('NOMBRE', 'Nombre(s)', 'first_name', 'texto'),
  ('APELLIDO_PATERNO', 'Apellido paterno', 'paternal_surname', 'texto'),
  ('APELLIDO_MATERNO', 'Apellido materno', 'maternal_surname', 'texto'),
  ('CURP', 'CURP', 'curp', 'curp'),
  ('RFC', 'RFC', 'rfc', 'rfc'),
  ('FECHA_NACIMIENTO', 'Fecha de nacimiento', 'date_of_birth', 'fecha'),
  ('SEXO', 'Sexo', 'sex', 'texto'),
  ('EMAIL', 'Correo electrónico', 'email', 'texto'),
  ('TELEFONO', 'Teléfono', 'phone', 'telefono'),
  ('CALLE', 'Calle', 'street', 'texto'),
  ('NUMERO', 'Número exterior', 'street_number', 'texto'),
  ('NUMERO_INTERIOR', 'Número interior', 'interior_number', 'texto'),
  ('COLONIA', 'Colonia', 'neighborhood', 'texto'),
  ('MUNICIPIO', 'Municipio', 'municipality', 'texto'),
  ('ESTADO', 'Estado', 'state', 'texto'),
  ('CP', 'Código postal', 'postal_code', 'texto'),
  ('PAIS', 'País', 'country', 'texto'),
  ('OCUPACION', 'Ocupación', 'occupation', 'texto'),
  ('NACIONALIDAD', 'Nacionalidad', 'nationality', 'texto'),
  ('ESTADO_CIVIL', 'Estado civil', 'estado_civil', 'texto');

-- =========================================================
-- SEED: mapeo_polizas
-- =========================================================
INSERT INTO public.mapeo_polizas (id, nombre_display, columna_origen, tipo) VALUES
  ('NUMERO', 'Número de póliza', 'policy_number', 'texto'),
  ('ASEGURADORA', 'Aseguradora', 'company', 'texto'),
  ('FECHA_INICIO', 'Fecha de inicio', 'start_date', 'fecha'),
  ('FECHA_FIN', 'Fecha de vencimiento', 'end_date', 'fecha'),
  ('SUMA_ASEGURADA', 'Suma asegurada', 'suma_asegurada', 'numero'),
  ('DEDUCIBLE', 'Deducible', 'deducible', 'numero'),
  ('COASEGURO', 'Coaseguro %', 'coaseguro_porcentaje', 'numero'),
  ('CERTIFICADO', 'Número de certificado', 'numero_certificado', 'texto'),
  ('CONTRATANTE', 'Contratante', 'contractor_name', 'texto'),
  ('TITULAR_NOMBRE', 'Nombre del titular', 'titular_first_name', 'texto'),
  ('AGENTE_NOMBRE', 'Nombre del agente', 'agente_nombre', 'texto'),
  ('AGENTE_TELEFONO', 'Teléfono del agente', 'agente_telefono', 'telefono'),
  ('AGENTE_CLAVE', 'Clave del agente', 'agente_clave', 'texto');

-- =========================================================
-- SEED: mapeo_siniestros
-- =========================================================
INSERT INTO public.mapeo_siniestros (id, nombre_display, columna_origen, tipo) VALUES
  ('FECHA', 'Fecha del siniestro', 'incident_date', 'fecha'),
  ('DIAGNOSTICO', 'Diagnóstico', 'diagnosis', 'diagnostico_cie'),
  ('TRATAMIENTO', 'Tratamiento', 'treatment', 'textarea'),
  ('CAUSA', 'Causa', 'cause', 'texto'),
  ('FECHA_PRIMERA_ATENCION', 'Fecha de primera atención', 'first_attention_date', 'fecha'),
  ('FECHA_INICIO_SINTOMAS', 'Inicio de síntomas', 'symptom_start_date', 'fecha'),
  ('NOTAS', 'Notas adicionales', 'notes', 'textarea');

-- =========================================================
-- SEED: aseguradoras (10)
-- =========================================================
INSERT INTO public.aseguradoras (nombre, slug, carpeta_storage, color_primario) VALUES
  ('ALLIANZ', 'allianz', 'ALLIANZ', '#003781'),
  ('AXA', 'axa', 'AXA', '#00008F'),
  ('BANORTE', 'banorte', 'BANORTE', '#EB0029'),
  ('GNP', 'gnp', 'GNP', '#F58220'),
  ('MAPFRE', 'mapfre', 'MAPFRE', '#D52B1E'),
  ('METLIFE', 'metlife', 'METLIFE', '#0090DA'),
  ('PLAN SEGURO', 'plan-seguro', 'PLAN SEGURO', '#1B4F8E'),
  ('QUALITAS', 'qualitas', 'QUALITAS', '#003D7A'),
  ('SEGUROS MONTERREY', 'seguros-monterrey', 'SEGUROS MONTERREY', '#00529B'),
  ('ZURICH', 'zurich', 'ZURICH', '#2167AE');

-- =========================================================
-- SEED: formularios (23)
-- =========================================================
WITH a AS (SELECT id, nombre FROM public.aseguradoras)
INSERT INTO public.formularios (aseguradora_id, nombre, nombre_display, storage_path, total_paginas, total_campos_estimado)
SELECT a.id, f.nombre, f.nombre_display, f.storage_path, f.paginas, f.campos
FROM a
JOIN (VALUES
  -- ALLIANZ
  ('ALLIANZ', 'identificacion_cliente', 'Identificación del Cliente', 'formatos/ALLIANZ/identificacion_cliente.pdf', 2, 25),
  ('ALLIANZ', 'aviso_accidente', 'Aviso de Accidente o Enfermedad', 'formatos/ALLIANZ/aviso_accidente.pdf', 3, 30),
  ('ALLIANZ', 'informe_medico', 'Informe Médico', 'formatos/ALLIANZ/informe_medico.pdf', 3, 28),
  -- AXA
  ('AXA', 'solicitud_reembolso', 'Solicitud de Reembolso', 'formatos/AXA/solicitud_reembolso.pdf', 2, 22),
  ('AXA', 'programacion_servicios', 'Programación de Servicios', 'formatos/AXA/programacion_servicios.pdf', 2, 18),
  ('AXA', 'informe_medico', 'Informe Médico', 'formatos/AXA/informe_medico.pdf', 3, 28),
  -- BANORTE
  ('BANORTE', 'informe_reclamante', 'Informe del Reclamante', 'formatos/BANORTE/informe_reclamante.PDF', 2, 20),
  ('BANORTE', 'informe_medico', 'Informe Médico', 'formatos/BANORTE/informe_medico.pdf', 3, 28),
  -- GNP
  ('GNP', 'solicitud_reembolso', 'Solicitud de Reembolso', 'formatos/GNP/solicitud_reembolso.pdf', 2, 22),
  ('GNP', 'informe_medico', 'Informe Médico', 'formatos/GNP/informe_medico.pdf', 3, 28),
  -- MAPFRE
  ('MAPFRE', 'solicitud_reembolso', 'Solicitud de Reembolso', 'formatos/MAPFRE/solicitud_reembolso.pdf', 2, 22),
  ('MAPFRE', 'informe_medico', 'Informe Médico', 'formatos/MAPFRE/informe_medico.pdf', 3, 28),
  -- METLIFE
  ('METLIFE', 'solicitud_reembolso', 'Solicitud de Reembolso', 'formatos/METLIFE/solicitud_reembolso.pdf', 2, 24),
  ('METLIFE', 'programacion_servicios', 'Programación de Servicios', 'formatos/METLIFE/programacion_servicios.pdf', 2, 18),
  ('METLIFE', 'consentimiento_informado', 'Consentimiento Informado', 'formatos/METLIFE/consentimiento_informado.pdf', 1, 12),
  ('METLIFE', 'informe_medico', 'Informe Médico', 'formatos/METLIFE/informe_medico.pdf', 3, 28),
  -- PLAN SEGURO
  ('PLAN SEGURO', 'solicitud_reembolso', 'Solicitud de Reembolso', 'formatos/PLAN SEGURO/solicitud_reembolso.pdf', 2, 22),
  ('PLAN SEGURO', 'informe_medico', 'Informe Médico', 'formatos/PLAN SEGURO/informe_medico.pdf', 3, 28),
  -- QUALITAS
  ('QUALITAS', 'informe_medico', 'Informe Médico', 'formatos/QUALITAS/informe_medico.pdf', 3, 28),
  -- SEGUROS MONTERREY
  ('SEGUROS MONTERREY', 'solicitud_reembolso', 'Solicitud de Reembolso', 'formatos/SEGUROS MONTERREY/solicitud_reembolso.pdf', 2, 22),
  ('SEGUROS MONTERREY', 'informe_medico', 'Informe Médico', 'formatos/SEGUROS MONTERREY/informe_medico.pdf', 3, 28),
  -- ZURICH
  ('ZURICH', 'solicitud_reembolso', 'Solicitud de Reembolso', 'formatos/ZURICH/solicitud_reembolso.pdf', 2, 22),
  ('ZURICH', 'informe_medico', 'Informe Médico', 'formatos/ZURICH/informe_medico.pdf', 3, 28)
) AS f(aseguradora, nombre, nombre_display, storage_path, paginas, campos)
ON a.nombre = f.aseguradora;

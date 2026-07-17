
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nombre text NOT NULL,
  nombre_plural text,
  descripcion text,
  sinonimos text[] DEFAULT '{}',
  icono text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.specialties TO anon, authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specialties public read" ON public.specialties FOR SELECT USING (activo = true);
CREATE POLICY "specialties admin write" ON public.specialties FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX specialties_sinonimos_gin ON public.specialties USING gin (sinonimos);
CREATE INDEX specialties_nombre_trgm ON public.specialties USING gin (nombre gin_trgm_ops);

CREATE TABLE public.professional_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  titulo text,
  tipo text NOT NULL DEFAULT 'medico' CHECK (tipo IN ('medico','enfermero','laboratorio','farmacia','nutricionista','psicologo','dentista')),
  bio text,
  foto_url text,
  cedula_profesional text,
  anos_experiencia int,
  idiomas text[] DEFAULT '{"Español"}',
  seguros_aceptados text[] DEFAULT '{}',
  precio_consulta_centavos int,
  precio_moneda text NOT NULL DEFAULT 'MXN',
  acepta_video boolean NOT NULL DEFAULT false,
  acepta_domicilio boolean NOT NULL DEFAULT false,
  acepta_presencial boolean NOT NULL DEFAULT true,
  rating_avg numeric(3,2) NOT NULL DEFAULT 0,
  rating_count int NOT NULL DEFAULT 0,
  vistas int NOT NULL DEFAULT 0,
  verificado boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT false,
  telefono_publico text,
  whatsapp_publico text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professional_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_profiles TO authenticated;
GRANT ALL ON public.professional_profiles TO service_role;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prof public read published" ON public.professional_profiles FOR SELECT USING (publicado = true);
CREATE POLICY "prof owner all" ON public.professional_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prof admin all" ON public.professional_profiles FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX prof_slug_idx ON public.professional_profiles (slug);
CREATE INDEX prof_publicado_idx ON public.professional_profiles (publicado) WHERE publicado = true;
CREATE INDEX prof_display_trgm ON public.professional_profiles USING gin (display_name gin_trgm_ops);
CREATE TRIGGER prof_updated_at BEFORE UPDATE ON public.professional_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.professional_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  direccion text NOT NULL,
  ciudad text NOT NULL,
  estado text,
  cp text,
  pais text NOT NULL DEFAULT 'México',
  lat numeric(9,6),
  lng numeric(9,6),
  telefono text,
  horarios jsonb,
  es_principal boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professional_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_locations TO authenticated;
GRANT ALL ON public.professional_locations TO service_role;
ALTER TABLE public.professional_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loc public read via published prof" ON public.professional_locations FOR SELECT
  USING (activo = true AND EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.publicado = true));
CREATE POLICY "loc owner all" ON public.professional_locations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid()));
CREATE POLICY "loc admin all" ON public.professional_locations FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX loc_ciudad_idx ON public.professional_locations (ciudad);
CREATE INDEX loc_prof_idx ON public.professional_locations (professional_id);
CREATE TRIGGER loc_updated_at BEFORE UPDATE ON public.professional_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.professional_specialties (
  professional_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  specialty_id uuid NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  es_principal boolean NOT NULL DEFAULT false,
  PRIMARY KEY (professional_id, specialty_id)
);
GRANT SELECT ON public.professional_specialties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_specialties TO authenticated;
GRANT ALL ON public.professional_specialties TO service_role;
ALTER TABLE public.professional_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps public read via published" ON public.professional_specialties FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.publicado = true));
CREATE POLICY "ps owner all" ON public.professional_specialties FOR ALL
  USING (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid()));
CREATE POLICY "ps admin all" ON public.professional_specialties FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.appointment_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE,
  professional_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  puntualidad int CHECK (puntualidad BETWEEN 1 AND 5),
  trato int CHECK (trato BETWEEN 1 AND 5),
  claridad int CHECK (claridad BETWEEN 1 AND 5),
  comentario text,
  verificada boolean NOT NULL DEFAULT true,
  publicada boolean NOT NULL DEFAULT true,
  reportada boolean NOT NULL DEFAULT false,
  respuesta_profesional text,
  respuesta_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.appointment_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_reviews TO authenticated;
GRANT ALL ON public.appointment_reviews TO service_role;
ALTER TABLE public.appointment_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read published" ON public.appointment_reviews FOR SELECT
  USING (publicada = true AND reportada = false);
CREATE POLICY "reviews patient insert own" ON public.appointment_reviews FOR INSERT
  WITH CHECK (auth.uid() = patient_id
    AND EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND a.user_id = auth.uid() AND a.appointment_date < now()));
CREATE POLICY "reviews patient update own" ON public.appointment_reviews FOR UPDATE
  USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "reviews professional respond" ON public.appointment_reviews FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid()));
CREATE POLICY "reviews admin all" ON public.appointment_reviews FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX reviews_prof_idx ON public.appointment_reviews (professional_id) WHERE publicada = true;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.appointment_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recalc_professional_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prof uuid := COALESCE(NEW.professional_id, OLD.professional_id);
  v_avg numeric; v_count int;
BEGIN
  SELECT COALESCE(AVG(rating),0), COUNT(*) INTO v_avg, v_count
    FROM public.appointment_reviews
    WHERE professional_id = v_prof AND publicada = true AND reportada = false;
  UPDATE public.professional_profiles
     SET rating_avg = ROUND(v_avg::numeric, 2), rating_count = v_count, updated_at = now()
   WHERE id = v_prof;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER reviews_recalc AFTER INSERT OR UPDATE OR DELETE ON public.appointment_reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalc_professional_rating();

INSERT INTO public.specialties (slug, nombre, nombre_plural, sinonimos, icono) VALUES
  ('medicina-general','Medicina general','Médicos generales','{"medico general","medicina familiar","doctor general"}','stethoscope'),
  ('pediatria','Pediatría','Pediatras','{"pediatra","medico de niños","medico infantil"}','baby'),
  ('ginecologia','Ginecología','Ginecólogos','{"ginecologo","ginecobstetra","obstetricia"}','venus'),
  ('cardiologia','Cardiología','Cardiólogos','{"cardiologo","corazon","cardio"}','heart-pulse'),
  ('dermatologia','Dermatología','Dermatólogos','{"dermatologo","piel","acne"}','sparkles'),
  ('nutricion','Nutrición','Nutriólogos','{"nutriologo","nutricionista","dieta"}','salad'),
  ('psicologia','Psicología','Psicólogos','{"psicologo","terapia","salud mental"}','brain'),
  ('odontologia','Odontología','Dentistas','{"dentista","odontologo","dientes"}','smile'),
  ('oftalmologia','Oftalmología','Oftalmólogos','{"oftalmologo","ojos","vista","optometrista"}','eye'),
  ('traumatologia','Traumatología','Traumatólogos','{"traumatologo","huesos","ortopedista","ortopedia"}','bone'),
  ('endocrinologia','Endocrinología','Endocrinólogos','{"endocrino","tiroides","diabetes"}','activity'),
  ('urologia','Urología','Urólogos','{"urologo","riñon","prostata"}','droplet'),
  ('neurologia','Neurología','Neurólogos','{"neurologo","cerebro","migraña"}','brain-circuit'),
  ('otorrinolaringologia','Otorrinolaringología','Otorrinos','{"otorrino","oido","garganta","nariz"}','ear'),
  ('laboratorio','Laboratorio clínico','Laboratorios','{"analisis","estudios","sangre"}','test-tube'),
  ('enfermeria','Enfermería a domicilio','Enfermeros','{"enfermero","cuidados domiciliarios"}','syringe')
ON CONFLICT (slug) DO NOTHING;

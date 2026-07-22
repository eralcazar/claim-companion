
-- Exercise catalog
CREATE TABLE public.exercise_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('fuerza','cardio','movilidad','deporte')),
  environment text NOT NULL CHECK (environment IN ('gym','calle','casa','ambos')),
  muscle_group text,
  equipment text,
  metric_type text NOT NULL CHECK (metric_type IN ('reps_weight','distance_time','time_only','reps_only')),
  icon text,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercise_catalog TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exercise_catalog TO authenticated;
GRANT ALL ON public.exercise_catalog TO service_role;
ALTER TABLE public.exercise_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read public or own exercises" ON public.exercise_catalog FOR SELECT USING (is_public = true OR created_by = auth.uid());
CREATE POLICY "insert own exercises" ON public.exercise_catalog FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "update own exercises" ON public.exercise_catalog FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "delete own exercises" ON public.exercise_catalog FOR DELETE USING (created_by = auth.uid());

-- Session logs (a full workout occurrence)
CREATE TABLE public.exercise_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  started_at timestamptz,
  environment text NOT NULL CHECK (environment IN ('gym','calle','casa')),
  location_label text,
  duration_min integer,
  rpe integer CHECK (rpe BETWEEN 1 AND 10),
  hr_avg integer,
  calories integer,
  notes text,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_session_logs TO authenticated;
GRANT ALL ON public.exercise_session_logs TO service_role;
ALTER TABLE public.exercise_session_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions all" ON public.exercise_session_logs FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE INDEX idx_session_logs_patient_fecha ON public.exercise_session_logs(patient_id, fecha DESC);

-- Set logs (per exercise within session)
CREATE TABLE public.exercise_set_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_log_id uuid NOT NULL REFERENCES public.exercise_session_logs(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercise_catalog(id),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_number integer NOT NULL DEFAULT 1,
  reps integer,
  weight_kg numeric(6,2),
  distance_m numeric(8,2),
  duration_sec integer,
  rest_sec integer,
  rpe integer CHECK (rpe BETWEEN 1 AND 10),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_set_logs TO authenticated;
GRANT ALL ON public.exercise_set_logs TO service_role;
ALTER TABLE public.exercise_set_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sets all" ON public.exercise_set_logs FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
CREATE INDEX idx_set_logs_patient_exercise ON public.exercise_set_logs(patient_id, exercise_id, created_at DESC);
CREATE INDEX idx_set_logs_session ON public.exercise_set_logs(session_log_id);

-- updated_at trigger reuse
CREATE TRIGGER trg_exercise_catalog_updated BEFORE UPDATE ON public.exercise_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_exercise_session_logs_updated BEFORE UPDATE ON public.exercise_session_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed catalog
INSERT INTO public.exercise_catalog (slug,name,category,environment,muscle_group,equipment,metric_type,icon) VALUES
('sentadilla','Sentadilla','fuerza','ambos','Piernas','Barra','reps_weight','dumbbell'),
('sentadilla-peso-corporal','Sentadilla peso corporal','fuerza','calle','Piernas','Ninguno','reps_only','activity'),
('peso-muerto','Peso muerto','fuerza','gym','Espalda/Piernas','Barra','reps_weight','dumbbell'),
('press-banca','Press banca','fuerza','gym','Pecho','Barra','reps_weight','dumbbell'),
('press-militar','Press militar','fuerza','gym','Hombros','Barra','reps_weight','dumbbell'),
('curl-biceps','Curl de bíceps','fuerza','gym','Bíceps','Mancuernas','reps_weight','dumbbell'),
('extension-triceps','Extensión de tríceps','fuerza','gym','Tríceps','Polea','reps_weight','dumbbell'),
('remo-barra','Remo con barra','fuerza','gym','Espalda','Barra','reps_weight','dumbbell'),
('jalon-al-pecho','Jalón al pecho','fuerza','gym','Espalda','Polea','reps_weight','dumbbell'),
('dominadas','Dominadas','fuerza','ambos','Espalda','Barra fija','reps_only','activity'),
('fondos','Fondos','fuerza','ambos','Pecho/Tríceps','Paralelas','reps_only','activity'),
('flexiones','Flexiones (lagartijas)','fuerza','calle','Pecho','Ninguno','reps_only','activity'),
('plancha','Plancha','fuerza','casa','Core','Ninguno','time_only','timer'),
('abdominales','Abdominales','fuerza','ambos','Core','Ninguno','reps_only','activity'),
('zancadas','Zancadas','fuerza','ambos','Piernas','Ninguno','reps_only','activity'),
('hip-thrust','Hip thrust','fuerza','gym','Glúteos','Barra','reps_weight','dumbbell'),
('prensa','Prensa','fuerza','gym','Piernas','Máquina','reps_weight','dumbbell'),
('elevaciones-laterales','Elevaciones laterales','fuerza','gym','Hombros','Mancuernas','reps_weight','dumbbell'),
('running','Correr','cardio','calle','Cardio','Ninguno','distance_time','activity'),
('running-cinta','Correr en cinta','cardio','gym','Cardio','Cinta','distance_time','activity'),
('caminata','Caminata','cardio','calle','Cardio','Ninguno','distance_time','activity'),
('ciclismo','Ciclismo','cardio','calle','Cardio','Bicicleta','distance_time','activity'),
('bici-estatica','Bicicleta estática','cardio','gym','Cardio','Bicicleta','distance_time','activity'),
('eliptica','Elíptica','cardio','gym','Cardio','Máquina','distance_time','activity'),
('remo-maquina','Remo máquina','cardio','gym','Cardio','Remo','distance_time','activity'),
('escaladora','Escaladora','cardio','gym','Cardio','Máquina','time_only','timer'),
('natacion','Natación','cardio','ambos','Cardio','Alberca','distance_time','activity'),
('burpees','Burpees','cardio','ambos','Full body','Ninguno','reps_only','activity'),
('jumping-jacks','Jumping jacks','cardio','ambos','Cardio','Ninguno','reps_only','activity'),
('mountain-climbers','Mountain climbers','cardio','ambos','Core','Ninguno','reps_only','activity'),
('saltar-cuerda','Saltar la cuerda','cardio','ambos','Cardio','Cuerda','time_only','timer'),
('yoga','Yoga','movilidad','ambos','Flexibilidad','Colchoneta','time_only','timer'),
('estiramiento','Estiramiento','movilidad','ambos','Flexibilidad','Ninguno','time_only','timer'),
('foam-roller','Foam roller','movilidad','ambos','Flexibilidad','Rodillo','time_only','timer'),
('futbol','Fútbol','deporte','calle','Deporte','Balón','time_only','timer'),
('basquetbol','Básquetbol','deporte','calle','Deporte','Balón','time_only','timer'),
('tenis','Tenis','deporte','calle','Deporte','Raqueta','time_only','timer'),
('padel','Pádel','deporte','calle','Deporte','Raqueta','time_only','timer'),
('boxeo','Boxeo','deporte','ambos','Full body','Guantes','time_only','timer'),
('escalada','Escalada','deporte','ambos','Full body','Muro','time_only','timer')
ON CONFLICT (slug) DO NOTHING;

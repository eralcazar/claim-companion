
-- Extend catalog with filter attributes
ALTER TABLE public.especialidades
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS pais TEXT NOT NULL DEFAULT 'MX';

-- Preload area for known specialties (idempotent updates)
UPDATE public.especialidades SET area = CASE
  WHEN nombre IN ('Cirugía General','Cirugía Cardiovascular','Cirugía Plástica y Reconstructiva','Cirugía Pediátrica','Neurocirugía','Traumatología y Ortopedia','Ginecología','Oftalmología','Otorrinolaringología','Urología','Angiología') THEN 'Quirúrgica'
  WHEN nombre IN ('Radiología','Patología','Anestesiología') THEN 'Diagnóstico'
  WHEN nombre IN ('Psicología Clínica','Psiquiatría') THEN 'Salud mental'
  WHEN nombre = 'Odontología' THEN 'Odontología'
  WHEN nombre IN ('Terapia Física y Rehabilitación','Nutriología Clínica','Medicina del Deporte') THEN 'Terapia'
  WHEN nombre IN ('Cardiología','Dermatología','Endocrinología','Gastroenterología','Geriatría','Hematología','Infectología','Medicina Familiar','Medicina General','Medicina Interna','Medicina del Trabajo','Nefrología','Neonatología','Neumología','Neurología','Oncología','Pediatría','Reumatología','Urgencias Médicas','Alergología e Inmunología') THEN 'Clínica'
  ELSE 'Otras'
END
WHERE area IS NULL;

UPDATE public.especialidades SET sector = 'Salud' WHERE sector IS NULL;

-- Favorites table
CREATE TABLE IF NOT EXISTS public.especialidad_favoritos (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  especialidad_id UUID NOT NULL REFERENCES public.especialidades(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, especialidad_id)
);

GRANT SELECT, INSERT, DELETE ON public.especialidad_favoritos TO authenticated;
GRANT ALL ON public.especialidad_favoritos TO service_role;

ALTER TABLE public.especialidad_favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own especialidad favorites"
  ON public.especialidad_favoritos
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

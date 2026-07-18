
CREATE TABLE public.especialidad_busquedas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  q TEXT DEFAULT '',
  area TEXT DEFAULT 'todas',
  pais TEXT DEFAULT 'todos',
  sector TEXT DEFAULT 'todos',
  only_favs BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, nombre)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.especialidad_busquedas TO authenticated;
GRANT ALL ON public.especialidad_busquedas TO service_role;

ALTER TABLE public.especialidad_busquedas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved searches"
  ON public.especialidad_busquedas
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_especialidad_busquedas_updated_at
  BEFORE UPDATE ON public.especialidad_busquedas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX especialidad_busquedas_user_last_idx
  ON public.especialidad_busquedas (user_id, last_used_at DESC);

ALTER TABLE public.campos DROP CONSTRAINT IF EXISTS campos_origen_check;
ALTER TABLE public.campos ADD CONSTRAINT campos_origen_check
  CHECK (origen = ANY (ARRAY['auto'::text, 'manual'::text, 'auto_ia'::text]));
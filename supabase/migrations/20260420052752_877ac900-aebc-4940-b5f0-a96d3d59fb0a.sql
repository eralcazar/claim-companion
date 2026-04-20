ALTER TABLE public.campos DROP CONSTRAINT IF EXISTS campos_tipo_check;
ALTER TABLE public.campos ADD CONSTRAINT campos_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'texto'::text, 'numero'::text, 'fecha'::text, 'checkbox'::text,
    'radio'::text, 'select'::text, 'firma'::text, 'textarea'::text,
    'telefono'::text, 'curp'::text, 'rfc'::text, 'diagnostico_cie'::text,
    'email'::text
  ]));
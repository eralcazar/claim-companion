
-- Campos reutilizables para llenar formatos MetLife (y otras aseguradoras):
-- datos bancarios para reembolso + médico tratante frecuente.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS clabe text,
  ADD COLUMN IF NOT EXISTS titular_cuenta text,
  ADD COLUMN IF NOT EXISTS medico_tratante_nombre text,
  ADD COLUMN IF NOT EXISTS medico_tratante_apellido_p text,
  ADD COLUMN IF NOT EXISTS medico_tratante_apellido_m text,
  ADD COLUMN IF NOT EXISTS medico_tratante_cedula text,
  ADD COLUMN IF NOT EXISTS medico_tratante_cedula_esp text,
  ADD COLUMN IF NOT EXISTS medico_tratante_especialidad text,
  ADD COLUMN IF NOT EXISTS medico_tratante_telefono text,
  ADD COLUMN IF NOT EXISTS medico_tratante_hospital text;

-- Validación ligera de CLABE (18 dígitos si se captura)
CREATE OR REPLACE FUNCTION public.validate_profile_banking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.clabe IS NOT NULL AND length(NEW.clabe) > 0 THEN
    NEW.clabe := regexp_replace(NEW.clabe, '\D', '', 'g');
    IF length(NEW.clabe) <> 18 THEN
      RAISE EXCEPTION 'CLABE inválida: debe tener 18 dígitos';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_banking ON public.profiles;
CREATE TRIGGER trg_validate_profile_banking
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_banking();

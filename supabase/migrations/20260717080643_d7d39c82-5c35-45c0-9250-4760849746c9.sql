
-- 1) Estado de publicación
ALTER TABLE public.professional_profiles
  ADD COLUMN IF NOT EXISTS estado_publicacion text NOT NULL DEFAULT 'borrador'
    CHECK (estado_publicacion IN ('borrador','pendiente','publicado','rechazado')),
  ADD COLUMN IF NOT EXISTS motivo_rechazo text,
  ADD COLUMN IF NOT EXISTS revisado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revisado_at timestamptz,
  ADD COLUMN IF NOT EXISTS enviado_revision_at timestamptz;

-- Trigger para sincronizar boolean 'publicado' con estado
CREATE OR REPLACE FUNCTION public.sync_profile_publicado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.publicado := (NEW.estado_publicacion = 'publicado');
  IF NEW.estado_publicacion = 'pendiente' AND (OLD IS NULL OR OLD.estado_publicacion <> 'pendiente') THEN
    NEW.enviado_revision_at := now();
  END IF;
  IF NEW.estado_publicacion IN ('publicado','rechazado')
     AND (OLD IS NULL OR OLD.estado_publicacion IS DISTINCT FROM NEW.estado_publicacion) THEN
    NEW.revisado_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_profile_publicado ON public.professional_profiles;
CREATE TRIGGER trg_sync_profile_publicado
  BEFORE INSERT OR UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_publicado();

-- Función helper para que el dueño no pueda auto-publicarse ni auto-verificarse
CREATE OR REPLACE FUNCTION public.protect_profile_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  -- No-admin: solo puede pasar entre borrador ↔ pendiente
  IF NEW.estado_publicacion NOT IN ('borrador','pendiente') THEN
    RAISE EXCEPTION 'Solo un administrador puede publicar o rechazar un perfil';
  END IF;
  -- Preservar campos protegidos
  IF OLD IS NOT NULL THEN
    NEW.verificado := OLD.verificado;
    NEW.motivo_rechazo := OLD.motivo_rechazo;
    NEW.revisado_por := OLD.revisado_por;
    NEW.revisado_at := OLD.revisado_at;
    NEW.rating_avg := OLD.rating_avg;
    NEW.rating_count := OLD.rating_count;
  ELSE
    NEW.verificado := false;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_profile_publish ON public.professional_profiles;
CREATE TRIGGER trg_protect_profile_publish
  BEFORE INSERT OR UPDATE ON public.professional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_publish();

CREATE INDEX IF NOT EXISTS prof_estado_idx ON public.professional_profiles(estado_publicacion);

CREATE TABLE public.firmas_usuario (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nombre text NOT NULL,
  imagen_base64 text NOT NULL,
  es_predeterminada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firmas_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own firmas"
  ON public.firmas_usuario FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own firmas"
  ON public.firmas_usuario FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own firmas"
  ON public.firmas_usuario FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own firmas"
  ON public.firmas_usuario FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX firmas_usuario_one_default_per_user
  ON public.firmas_usuario(user_id)
  WHERE es_predeterminada = true;

CREATE TRIGGER update_firmas_usuario_updated_at
  BEFORE UPDATE ON public.firmas_usuario
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
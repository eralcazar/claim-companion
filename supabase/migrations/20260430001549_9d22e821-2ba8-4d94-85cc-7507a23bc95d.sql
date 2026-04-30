
-- 1) Paquete Gratuito
INSERT INTO public.subscription_plans (nombre, descripcion, precio_mensual_centavos, precio_anual_centavos, moneda, ocr_pages_per_month, activo, orden)
SELECT 'Gratuito', 'Paquete inicial: 5 escaneos OCR al mes y expediente básico.', 0, 0, 'mxn', 5, true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE nombre = 'Gratuito');

-- 2) Profiles: rol activo
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_role app_role;

-- 3) Matriz feature x rol x paquete
CREATE TABLE IF NOT EXISTS public.plan_role_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  feature_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, role, feature_key)
);

ALTER TABLE public.plan_role_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read plan_role_features" ON public.plan_role_features;
CREATE POLICY "Authenticated read plan_role_features"
  ON public.plan_role_features FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manages plan_role_features" ON public.plan_role_features;
CREATE POLICY "Admin manages plan_role_features"
  ON public.plan_role_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Función: validar regla de rol activo (paciente siempre coexiste; broker es exclusivo)
CREATE OR REPLACE FUNCTION public.set_active_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) THEN
    RAISE EXCEPTION 'El usuario no tiene asignado ese rol';
  END IF;

  UPDATE public.profiles SET active_role = _role WHERE user_id = _user_id;
END;
$$;

-- 5) Función: regalar paquete (asignación manual gratuita)
CREATE OR REPLACE FUNCTION public.assign_free_plan(_user_id uuid, _plan_id uuid, _months integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;

  -- Cancelar suscripción manual previa (si existe sin stripe_subscription_id)
  UPDATE public.subscriptions
    SET status = 'canceled', cancel_at_period_end = true, updated_at = now()
    WHERE user_id = _user_id AND status IN ('active','trialing') AND stripe_subscription_id IS NULL;

  INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, environment)
  VALUES (_user_id, _plan_id, 'active', now(), now() + (COALESCE(_months,1) || ' months')::interval, 'manual');

  PERFORM public.sync_subscription_ocr_quota(_user_id);
END;
$$;

-- 6) Función: comprobar acceso considerando paquete activo
CREATE OR REPLACE FUNCTION public.user_has_feature_access(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_plan AS (
    SELECT plan_id FROM public.subscriptions
    WHERE user_id = _user_id
      AND status IN ('active','trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
    ORDER BY updated_at DESC LIMIT 1
  ), user_active_roles AS (
    SELECT role FROM public.user_roles WHERE user_id = _user_id
  )
  SELECT
    -- Admins siempre
    EXISTS (SELECT 1 FROM user_active_roles WHERE role = 'admin'::app_role)
    -- Permiso base por rol
    OR EXISTS (
      SELECT 1
      FROM public.role_permissions rp
      JOIN user_active_roles uar ON uar.role = rp.role
      WHERE rp.feature_key = _feature AND rp.allowed = true
        AND (
          -- Si no hay matriz por paquete configurada para este feature/rol, basta con el permiso de rol
          NOT EXISTS (
            SELECT 1 FROM public.plan_role_features prf
            WHERE prf.feature_key = _feature AND prf.role = rp.role AND prf.allowed = true
          )
          -- Si sí hay matriz, exige que el paquete activo esté incluido
          OR EXISTS (
            SELECT 1 FROM public.plan_role_features prf, active_plan ap
            WHERE prf.feature_key = _feature AND prf.role = rp.role
              AND prf.allowed = true AND prf.plan_id = ap.plan_id
          )
        )
    );
$$;

-- 7) Trigger handle_new_user: asignar paquete gratuito al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_plan uuid;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, active_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.email, ''),
    'paciente'::app_role
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'paciente');

  SELECT id INTO v_free_plan FROM public.subscription_plans WHERE nombre = 'Gratuito' LIMIT 1;
  IF v_free_plan IS NOT NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end, environment)
    VALUES (NEW.id, v_free_plan, 'active', now(), now() + interval '100 years', 'manual');
    PERFORM public.sync_subscription_ocr_quota(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- 8) Asegurar trigger sobre auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

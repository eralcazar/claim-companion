CREATE TABLE public.role_permissions (
  role public.app_role NOT NULL,
  feature_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, feature_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read permissions"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage permissions"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.role_permissions (role, feature_key, allowed) VALUES
  -- inicio: todos
  ('admin','inicio',true),('broker','inicio',true),('paciente','inicio',true),('medico','inicio',true),
  -- reclamos
  ('admin','reclamos',true),('broker','reclamos',true),('paciente','reclamos',true),('medico','reclamos',false),
  -- polizas
  ('admin','polizas',true),('broker','polizas',true),('paciente','polizas',true),('medico','polizas',false),
  -- formatos
  ('admin','formatos',true),('broker','formatos',true),('paciente','formatos',true),('medico','formatos',false),
  -- agenda
  ('admin','agenda',true),('broker','agenda',false),('paciente','agenda',true),('medico','agenda',true),
  -- medicamentos
  ('admin','medicamentos',true),('broker','medicamentos',false),('paciente','medicamentos',true),('medico','medicamentos',false),
  -- registros
  ('admin','registros',true),('broker','registros',false),('paciente','registros',true),('medico','registros',false),
  -- perfil
  ('admin','perfil',true),('broker','perfil',true),('paciente','perfil',true),('medico','perfil',true),
  -- broker_panel
  ('admin','broker_panel',true),('broker','broker_panel',true),('paciente','broker_panel',false),('medico','broker_panel',false),
  -- doctor_panel
  ('admin','doctor_panel',true),('broker','doctor_panel',false),('paciente','doctor_panel',false),('medico','doctor_panel',true),
  -- admin_panel
  ('admin','admin_panel',true),('broker','admin_panel',false),('paciente','admin_panel',false),('medico','admin_panel',false),
  -- format_manager
  ('admin','format_manager',true),('broker','format_manager',false),('paciente','format_manager',false),('medico','format_manager',false),
  -- user_manager
  ('admin','user_manager',true),('broker','user_manager',false),('paciente','user_manager',false),('medico','user_manager',false),
  -- access_manager
  ('admin','access_manager',true),('broker','access_manager',false),('paciente','access_manager',false),('medico','access_manager',false);
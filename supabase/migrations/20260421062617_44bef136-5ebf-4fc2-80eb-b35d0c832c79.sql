INSERT INTO public.role_permissions (role, feature_key, allowed) VALUES
  ('admin', 'tendencias', true),
  ('medico', 'tendencias', true),
  ('paciente', 'tendencias', true),
  ('broker', 'tendencias', true)
ON CONFLICT (role, feature_key) DO UPDATE SET allowed = EXCLUDED.allowed;
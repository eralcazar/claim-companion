
DROP POLICY IF EXISTS ai_settings_read_all ON public.ai_settings;
CREATE POLICY ai_settings_admin_read ON public.ai_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Autenticados leen metadata" ON public.integrity_keys;
CREATE POLICY "Admins leen metadata" ON public.integrity_keys FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

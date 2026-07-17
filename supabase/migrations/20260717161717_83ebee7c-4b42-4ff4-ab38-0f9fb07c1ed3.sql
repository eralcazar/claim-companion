
DROP POLICY IF EXISTS "BodyAnnBucket select authenticated" ON storage.objects;
DROP POLICY IF EXISTS "BodyAnnBucket select authorized" ON storage.objects;
CREATE POLICY "BodyAnnBucket select authorized"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'body-annotations'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.body_annotation_files f
      JOIN public.body_annotations a ON a.id = f.annotation_id
      WHERE f.file_path = storage.objects.name
        AND public.has_patient_access(auth.uid(), a.patient_id)
    )
  )
);

DROP POLICY IF EXISTS "Estudios storage view" ON storage.objects;
CREATE POLICY "Estudios storage view"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'estudios-resultados'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.estudios_solicitados e
      WHERE (e.id)::text = (storage.foldername(storage.objects.name))[2]
        AND (
          e.patient_id = auth.uid()
          OR e.doctor_id = auth.uid()
          OR public.has_patient_access(auth.uid(), e.patient_id)
        )
    )
  )
);

DROP POLICY IF EXISTS "Users view own schedule" ON public.medication_schedule;
CREATE POLICY "Users view own schedule"
ON public.medication_schedule FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_patient_access(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users insert own schedule" ON public.medication_schedule;
CREATE POLICY "Users insert own schedule"
ON public.medication_schedule FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_patient_access(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users update own schedule" ON public.medication_schedule;
CREATE POLICY "Users update own schedule"
ON public.medication_schedule FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_patient_access(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "publico lee competencia" ON public.pharmacy_competitor_prices;
CREATE POLICY "staff lee competencia"
ON public.pharmacy_competitor_prices FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'admin_farmacia'::app_role)
  OR public.has_role(auth.uid(), 'farmaceutico'::app_role)
  OR public.has_role(auth.uid(), 'farmacia'::app_role)
);
REVOKE SELECT ON public.pharmacy_competitor_prices FROM anon;

REVOKE SELECT (cedula_profesional) ON public.professional_profiles FROM anon;
REVOKE SELECT (cedula_profesional) ON public.professional_profiles FROM PUBLIC;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_patient_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_feature_access(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_plan_feature(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_record_hash(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_free_plan(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sugerir_lotes_fefo(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pharmacy_lots_rotation_alerts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pharmacy_customer_aging(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pharmacy_stock_disponible(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kari_usage_by_user(timestamptz, timestamptz, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kari_usage_daily(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kari_usage_summary(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_professional_slots(uuid, date, date) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_pushed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_kari_monthly_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_open_session(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pos_close_session(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gen_folio(text, text) TO authenticated;

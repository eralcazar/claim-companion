
DROP POLICY IF EXISTS "ai_token_monthly_limits_read_authenticated" ON public.ai_token_monthly_limits;

DROP POLICY IF EXISTS "BodyAnn select via access" ON public.body_annotations;
CREATE POLICY "BodyAnn select via access" ON public.body_annotations
FOR SELECT TO authenticated
USING (
  auth.uid() = patient_id
  OR auth.uid() = created_by
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_patient_access(auth.uid(), patient_id)
  OR (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
    SELECT 1 FROM public.broker_patients bp
    WHERE bp.broker_id = auth.uid() AND bp.patient_id = body_annotations.patient_id
  ))
);

DROP POLICY IF EXISTS "BodyAnnFiles select via parent" ON public.body_annotation_files;
CREATE POLICY "BodyAnnFiles select via parent" ON public.body_annotation_files
FOR SELECT TO authenticated
USING (
  uploaded_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.body_annotations ba
    WHERE ba.id = body_annotation_files.annotation_id
      AND (
        ba.patient_id = auth.uid()
        OR ba.created_by = auth.uid()
        OR has_patient_access(auth.uid(), ba.patient_id)
        OR (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
          SELECT 1 FROM public.broker_patients bp
          WHERE bp.broker_id = auth.uid() AND bp.patient_id = ba.patient_id
        ))
      )
  )
);

DROP POLICY IF EXISTS "Estudio items view via parent" ON public.estudio_items;
CREATE POLICY "Estudio items view via parent" ON public.estudio_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.estudios_solicitados e
    WHERE e.id = estudio_items.estudio_id
      AND (
        e.patient_id = auth.uid()
        OR e.doctor_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_patient_access(auth.uid(), e.patient_id)
        OR (has_role(auth.uid(), 'broker'::app_role) AND EXISTS (
          SELECT 1 FROM public.broker_patients bp
          WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id
        ))
      )
  )
);

DROP POLICY IF EXISTS "Resultados delete admin or uploader" ON public.resultados_estudios;
CREATE POLICY "Resultados delete admin or lab with access" ON public.resultados_estudios
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    uploaded_by = auth.uid()
    AND has_role(auth.uid(), 'laboratorio'::app_role)
    AND has_patient_access(auth.uid(), patient_id)
  )
);

DROP POLICY IF EXISTS "Formatos publicly readable" ON storage.objects;
CREATE POLICY "Formatos readable by authenticated" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'formatos');

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_clinical_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_reading_review() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_medical_alert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_reading_review_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_inventory_movement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_lot_movement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_integrity_chain() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_integrity_immutability() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.appointments_restrict_doctor_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_invoice_folio() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pharmacy_lot_auto_estado() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_spo2_reading() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_blood_pressure_reading() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_bp_reminder() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_mh_lifestyle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_mh_condition() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_mh_family() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_mh_allergy() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_food_traffic() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_nutrition_metrics() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_curp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_folio(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_ai_tokens(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_ocr_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_subscription_ocr_quota(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ai_tokens(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_ocr_quota(uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_free_plan(uuid, uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_kari_usage_daily(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_kari_usage_by_user(timestamptz, timestamptz, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_kari_usage_summary(timestamptz, timestamptz) FROM PUBLIC, anon;

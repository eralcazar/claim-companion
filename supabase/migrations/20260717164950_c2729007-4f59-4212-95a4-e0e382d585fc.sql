
-- 1) professional_profiles: revoke cedula_profesional from anon
REVOKE SELECT (cedula_profesional) ON public.professional_profiles FROM anon;
REVOKE SELECT (cedula_profesional) ON public.professional_profiles FROM PUBLIC;

-- 2) Storage: tighten Estudios storage insert policy
DROP POLICY IF EXISTS "Estudios storage insert" ON storage.objects;
CREATE POLICY "Estudios storage insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'estudios-resultados'
  AND owner = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.estudios_solicitados e
      WHERE (e.id)::text = (storage.foldername(objects.name))[2]
        AND (
          e.doctor_id = auth.uid()
          OR (
            public.has_role(auth.uid(), 'laboratorio'::app_role)
            AND public.has_patient_access(auth.uid(), e.patient_id)
          )
          OR (
            public.has_role(auth.uid(), 'broker'::app_role)
            AND EXISTS (
              SELECT 1 FROM public.broker_patients bp
              WHERE bp.broker_id = auth.uid() AND bp.patient_id = e.patient_id
            )
          )
        )
    )
  )
);

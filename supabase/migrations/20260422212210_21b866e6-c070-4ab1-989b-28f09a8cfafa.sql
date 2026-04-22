-- Add moderation fields to body_annotations
ALTER TABLE public.body_annotations
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS moderation_note text,
  ADD COLUMN IF NOT EXISTS moderated_by uuid,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

-- Allow doctor of the appointment / admin to update moderation status of any annotation in their scope
DROP POLICY IF EXISTS "BodyAnn moderate by doctor or admin" ON public.body_annotations;
CREATE POLICY "BodyAnn moderate by doctor or admin"
ON public.body_annotations
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (appointment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = body_annotations.appointment_id AND a.doctor_id = auth.uid()
  ))
  OR (has_role(auth.uid(), 'medico'::app_role) AND has_patient_access(auth.uid(), patient_id))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (appointment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = body_annotations.appointment_id AND a.doctor_id = auth.uid()
  ))
  OR (has_role(auth.uid(), 'medico'::app_role) AND has_patient_access(auth.uid(), patient_id))
);
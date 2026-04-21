-- Allow doctors to insert appointments where they are the assigned doctor
CREATE POLICY "Doctors can insert appts they attend"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = doctor_id AND public.has_role(auth.uid(), 'medico'::app_role));

-- Allow doctors to delete appointments they are assigned to (so they can clean up if needed)
CREATE POLICY "Doctors can delete assigned appts"
ON public.appointments
FOR DELETE
TO authenticated
USING (auth.uid() = doctor_id AND public.has_role(auth.uid(), 'medico'::app_role));

-- Allow patients to view appointments where they are the doctor's patient (when a doctor creates one for them)
-- The existing "Users can view own appointments" already covers this via user_id, no change needed.

-- Enable medicos to access /agenda by default
INSERT INTO public.role_permissions (role, feature_key, allowed)
VALUES ('medico'::app_role, 'agenda', true)
ON CONFLICT (role, feature_key) DO UPDATE SET allowed = true, updated_at = now();
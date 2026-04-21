-- 1. Add column for doctor observations
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS doctor_observations text;

-- 2. Allow doctors to update appointments where they are assigned
CREATE POLICY "Doctors can update assigned appts"
ON public.appointments
FOR UPDATE
TO authenticated
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- 3. Trigger function: if updater is the doctor (and not the owner/admin),
-- only allow doctor_observations and updated_at to change.
CREATE OR REPLACE FUNCTION public.appointments_restrict_doctor_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() = OLD.doctor_id
     AND auth.uid() <> OLD.user_id
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
  THEN
    NEW.user_id := OLD.user_id;
    NEW.doctor_id := OLD.doctor_id;
    NEW.appointment_date := OLD.appointment_date;
    NEW.appointment_type := OLD.appointment_type;
    NEW.doctor_name_manual := OLD.doctor_name_manual;
    NEW.address := OLD.address;
    NEW.address_lat := OLD.address_lat;
    NEW.address_lng := OLD.address_lng;
    NEW.notes := OLD.notes;
    NEW.reminder_enabled := OLD.reminder_enabled;
    NEW.reminder_minutes_before := OLD.reminder_minutes_before;
    NEW.reminder_sent_at := OLD.reminder_sent_at;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_restrict_doctor_update ON public.appointments;
CREATE TRIGGER trg_appointments_restrict_doctor_update
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.appointments_restrict_doctor_update();
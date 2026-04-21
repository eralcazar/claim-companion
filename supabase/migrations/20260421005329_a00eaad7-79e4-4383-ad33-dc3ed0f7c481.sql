
-- 1. Add columns to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS doctor_name_manual text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS address_lat double precision,
  ADD COLUMN IF NOT EXISTS address_lng double precision,
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_minutes_before integer,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- 2. Document category enum
DO $$ BEGIN
  CREATE TYPE public.appointment_document_category AS ENUM (
    'receta','estudio','notas_medicas','cfdi','impresion_cfdi','otro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. appointment_documents table
CREATE TABLE IF NOT EXISTS public.appointment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  document_category public.appointment_document_category NOT NULL DEFAULT 'otro',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_documents_appointment ON public.appointment_documents(appointment_id);

ALTER TABLE public.appointment_documents ENABLE ROW LEVEL SECURITY;

-- Helper predicate inline via EXISTS on appointments
CREATE POLICY "Stakeholders can view appointment docs"
  ON public.appointment_documents FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_documents.appointment_id
        AND (
          a.user_id = auth.uid()
          OR a.doctor_id = auth.uid()
          OR (has_role(auth.uid(),'broker'::app_role) AND EXISTS (
            SELECT 1 FROM public.broker_patients bp
            WHERE bp.broker_id = auth.uid() AND bp.patient_id = a.user_id
          ))
        )
    )
  );

CREATE POLICY "Stakeholders can insert appointment docs"
  ON public.appointment_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.id = appointment_documents.appointment_id
          AND (
            a.user_id = auth.uid()
            OR a.doctor_id = auth.uid()
            OR (has_role(auth.uid(),'broker'::app_role) AND EXISTS (
              SELECT 1 FROM public.broker_patients bp
              WHERE bp.broker_id = auth.uid() AND bp.patient_id = a.user_id
            ))
          )
      )
    )
  );

CREATE POLICY "Stakeholders can delete appointment docs"
  ON public.appointment_documents FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_documents.appointment_id
        AND (a.user_id = auth.uid() OR a.doctor_id = auth.uid())
    )
  );

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;

-- 5. Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('appointment-docs','appointment-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path = appointment_id/filename
CREATE POLICY "Stakeholders read appointment docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'appointment-docs' AND (
      has_role(auth.uid(),'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND (
            a.user_id = auth.uid()
            OR a.doctor_id = auth.uid()
            OR (has_role(auth.uid(),'broker'::app_role) AND EXISTS (
              SELECT 1 FROM public.broker_patients bp
              WHERE bp.broker_id = auth.uid() AND bp.patient_id = a.user_id
            ))
          )
      )
    )
  );

CREATE POLICY "Stakeholders upload appointment docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'appointment-docs' AND (
      has_role(auth.uid(),'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND (
            a.user_id = auth.uid()
            OR a.doctor_id = auth.uid()
            OR (has_role(auth.uid(),'broker'::app_role) AND EXISTS (
              SELECT 1 FROM public.broker_patients bp
              WHERE bp.broker_id = auth.uid() AND bp.patient_id = a.user_id
            ))
          )
      )
    )
  );

CREATE POLICY "Stakeholders delete appointment docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'appointment-docs' AND (
      has_role(auth.uid(),'admin'::app_role)
      OR owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.id::text = (storage.foldername(name))[1]
          AND (a.user_id = auth.uid() OR a.doctor_id = auth.uid())
      )
    )
  );

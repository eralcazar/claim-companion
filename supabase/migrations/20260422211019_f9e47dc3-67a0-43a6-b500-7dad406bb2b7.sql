-- 1. Telemedicina en appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_telemedicine boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meeting_url text;

-- 2. Tabla body_annotations
CREATE TABLE IF NOT EXISTS public.body_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  body_view text NOT NULL DEFAULT 'frontal' CHECK (body_view IN ('frontal','posterior')),
  body_part text NOT NULL,
  marker_x numeric NOT NULL DEFAULT 50,
  marker_y numeric NOT NULL DEFAULT 50,
  note text,
  severity text NOT NULL DEFAULT 'leve' CHECK (severity IN ('leve','moderada','grave')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_annotations_appointment ON public.body_annotations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_body_annotations_patient ON public.body_annotations(patient_id);

ALTER TABLE public.body_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BodyAnn select via access"
  ON public.body_annotations FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_patient_access(auth.uid(), patient_id)
    OR (
      appointment_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.id = body_annotations.appointment_id
          AND (a.doctor_id = auth.uid() OR a.user_id = auth.uid())
      )
    )
    OR (
      public.has_role(auth.uid(), 'broker') AND EXISTS (
        SELECT 1 FROM public.broker_patients bp
        WHERE bp.broker_id = auth.uid() AND bp.patient_id = body_annotations.patient_id
      )
    )
  );

CREATE POLICY "BodyAnn insert by doctor or admin"
  ON public.body_annotations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        appointment_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.appointments a
          WHERE a.id = body_annotations.appointment_id
            AND a.doctor_id = auth.uid()
        )
      )
      OR (
        public.has_role(auth.uid(), 'medico') AND public.has_patient_access(auth.uid(), patient_id)
      )
    )
  );

CREATE POLICY "BodyAnn update by creator or admin"
  ON public.body_annotations FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "BodyAnn delete by creator or admin"
  ON public.body_annotations FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_body_annotations_updated_at
  BEFORE UPDATE ON public.body_annotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tabla body_annotation_files
CREATE TABLE IF NOT EXISTS public.body_annotation_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annotation_id uuid NOT NULL REFERENCES public.body_annotations(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'application/octet-stream',
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_annotation_files_annotation ON public.body_annotation_files(annotation_id);

ALTER TABLE public.body_annotation_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BodyAnnFiles select via parent"
  ON public.body_annotation_files FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.body_annotations ba
      WHERE ba.id = body_annotation_files.annotation_id
    )
  );

CREATE POLICY "BodyAnnFiles insert via parent"
  ON public.body_annotation_files FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.body_annotations ba
      WHERE ba.id = body_annotation_files.annotation_id
        AND (
          ba.created_by = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "BodyAnnFiles delete via parent"
  ON public.body_annotation_files FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.body_annotations ba
      WHERE ba.id = body_annotation_files.annotation_id
        AND ba.created_by = auth.uid()
    )
  );

-- 4. Storage bucket for body annotation files
INSERT INTO storage.buckets (id, name, public)
VALUES ('body-annotations', 'body-annotations', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "BodyAnnBucket select authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'body-annotations');

CREATE POLICY "BodyAnnBucket insert own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'body-annotations'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "BodyAnnBucket delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'body-annotations'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );
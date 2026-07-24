
CREATE TABLE IF NOT EXISTS public.home_visit_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL UNIQUE REFERENCES public.home_visit_requests(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  doctor_id uuid,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.home_visit_reviews TO authenticated;
GRANT ALL ON public.home_visit_reviews TO service_role;

ALTER TABLE public.home_visit_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS home_visit_reviews_doctor_idx ON public.home_visit_reviews(doctor_id);

DROP POLICY IF EXISTS "hvr_select" ON public.home_visit_reviews;
CREATE POLICY "hvr_select" ON public.home_visit_reviews
  FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR auth.uid() = doctor_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "hvr_insert_patient" ON public.home_visit_reviews;
CREATE POLICY "hvr_insert_patient" ON public.home_visit_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = patient_id
    AND EXISTS (
      SELECT 1 FROM public.home_visit_requests r
      WHERE r.id = visit_id
        AND r.patient_id = auth.uid()
        AND r.estado = 'completada'
    )
  );

DROP POLICY IF EXISTS "hvr_update_patient" ON public.home_visit_reviews;
CREATE POLICY "hvr_update_patient" ON public.home_visit_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE OR REPLACE FUNCTION public.set_updated_at_generic()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_hvr_updated_at ON public.home_visit_reviews;
CREATE TRIGGER trg_hvr_updated_at BEFORE UPDATE ON public.home_visit_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_generic();

-- Notify doctor when a review is created
CREATE OR REPLACE FUNCTION public.notify_home_visit_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.doctor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, category, link, event_key)
    VALUES (NEW.doctor_id,
            '⭐ Nueva reseña de visita',
            'Un paciente calificó tu visita con ' || NEW.rating || '/5.',
            'home_visit', '/domicilio',
            'home_visit_review:' || NEW.id)
    ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_hvr_notify ON public.home_visit_reviews;
CREATE TRIGGER trg_hvr_notify AFTER INSERT ON public.home_visit_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_home_visit_review();

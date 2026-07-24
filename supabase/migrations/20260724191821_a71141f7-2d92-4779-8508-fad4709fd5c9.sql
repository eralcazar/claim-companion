
ALTER TABLE public.home_visit_requests
  ADD COLUMN IF NOT EXISTS doctor_lat numeric,
  ADD COLUMN IF NOT EXISTS doctor_lng numeric,
  ADD COLUMN IF NOT EXISTS doctor_location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS doctor_location_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS doctor_location_sharing boolean NOT NULL DEFAULT false;

ALTER TABLE public.home_visit_requests REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'home_visit_requests'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.home_visit_requests';
  END IF;
END $$;

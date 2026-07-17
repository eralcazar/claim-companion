
CREATE TABLE public.user_device_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  firmware text,
  app_version text,
  status text NOT NULL CHECK (status IN ('success','partial','failed')),
  connection_method text,
  notes text,
  tested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_udv_user_device ON public.user_device_verifications (user_id, device_id, tested_at DESC);
CREATE INDEX idx_udv_device_status ON public.user_device_verifications (device_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_device_verifications TO authenticated;
GRANT ALL ON public.user_device_verifications TO service_role;

ALTER TABLE public.user_device_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own verifications select" ON public.user_device_verifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "own verifications insert" ON public.user_device_verifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own verifications update" ON public.user_device_verifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own verifications delete" ON public.user_device_verifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

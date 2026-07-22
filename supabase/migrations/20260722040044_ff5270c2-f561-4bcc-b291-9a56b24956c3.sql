
-- Solicitudes de prueba de dispositivos + evidencia
CREATE TABLE public.device_test_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  region TEXT,
  firmware TEXT,
  app_version TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','verified','rejected')),
  evidence_path TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dtr_user ON public.device_test_requests (user_id, created_at DESC);
CREATE INDEX idx_dtr_device_status ON public.device_test_requests (device_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_test_requests TO authenticated;
GRANT ALL ON public.device_test_requests TO service_role;

ALTER TABLE public.device_test_requests ENABLE ROW LEVEL SECURITY;

-- Usuario ve sus propias solicitudes; admin ve todas
CREATE POLICY "dtr select own or admin" ON public.device_test_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Usuario crea solo con su user_id y status pending
CREATE POLICY "dtr insert own pending" ON public.device_test_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending' AND resolved_by IS NULL AND resolved_at IS NULL);

-- Usuario puede editar nota/region/firmware mientras siga pending; admin edita todo
CREATE POLICY "dtr update own pending or admin" ON public.device_test_requests
  FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() AND status = 'pending')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (user_id = auth.uid() AND status = 'pending' AND resolved_by IS NULL)
  );

CREATE POLICY "dtr delete own pending or admin" ON public.device_test_requests
  FOR DELETE TO authenticated
  USING (
    (user_id = auth.uid() AND status = 'pending')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_dtr_updated_at
  BEFORE UPDATE ON public.device_test_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies para bucket device-test-evidence
-- Estructura de path: {user_id}/{request_id}/archivo
CREATE POLICY "dte select own or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'device-test-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "dte insert own or admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'device-test-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "dte update admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'device-test-evidence' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "dte delete admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'device-test-evidence' AND public.has_role(auth.uid(), 'admin'));

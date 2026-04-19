-- Crear bucket público "formatos" para PDFs originales de aseguradoras
INSERT INTO storage.buckets (id, name, public)
VALUES ('formatos', 'formatos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lectura pública
CREATE POLICY "Formatos publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'formatos');

-- Solo admins pueden subir/modificar/eliminar
CREATE POLICY "Admins can upload formatos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'formatos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update formatos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'formatos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete formatos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'formatos' AND public.has_role(auth.uid(), 'admin'::app_role));
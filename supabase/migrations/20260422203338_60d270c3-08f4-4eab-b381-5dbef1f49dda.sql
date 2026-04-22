
-- Hacer el bucket privado y restringir lectura a usuarios autenticados.
UPDATE storage.buckets SET public = false WHERE id = 'pharmacy-products';

DROP POLICY IF EXISTS "Public can read individual pharmacy product images" ON storage.objects;

CREATE POLICY "Authenticated read pharmacy product images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pharmacy-products');

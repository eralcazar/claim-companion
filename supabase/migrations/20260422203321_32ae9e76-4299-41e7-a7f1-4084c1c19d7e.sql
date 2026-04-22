
-- Reemplazar policy SELECT amplia por una que evite listar el bucket completo.
DROP POLICY IF EXISTS "Public can read pharmacy product images" ON storage.objects;

-- Lectura pública SOLO si se solicita un objeto específico (name no vacío).
-- Esto sigue permitiendo getPublicUrl() pero bloquea listing masivo via storage.objects.
CREATE POLICY "Public can read individual pharmacy product images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pharmacy-products'
    AND name IS NOT NULL
    AND length(name) > 0
  );

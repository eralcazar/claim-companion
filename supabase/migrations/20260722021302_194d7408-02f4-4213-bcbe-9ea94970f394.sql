
INSERT INTO public.ai_provider_policy
  (feature_key, label, model, max_input_tokens, max_output_tokens,
   history_window, enable_cache, cache_ttl_hours, provider, notes)
VALUES
  ('glossary', 'Glosario educativo', 'gpt-3.5-turbo',
   1000, 400, 0, true, 720, 'apifreellm',
   'Preguntas educativas genéricas sin PII. El endpoint rechaza cualquier prompt no genérico según isCacheableGeneric.')
ON CONFLICT (feature_key) DO NOTHING;

-- Activar ApiFreeLLM en el catálogo para que la política pueda usarse.
UPDATE public.ai_external_providers SET activo = true WHERE id = 'apifreellm';

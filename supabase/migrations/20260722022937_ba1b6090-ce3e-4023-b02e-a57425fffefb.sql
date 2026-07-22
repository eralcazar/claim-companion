
-- Extender ai_external_providers para soportar BYOK
ALTER TABLE public.ai_external_providers
  ADD COLUMN IF NOT EXISTS requires_api_key boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secret_name text,
  ADD COLUMN IF NOT EXISTS models jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_model text,
  ADD COLUMN IF NOT EXISTS docs_url text;

-- Seed: Google Gemini (BYOK vía OpenAI-compat endpoint)
INSERT INTO public.ai_external_providers (id, nombre, endpoint, aviso_legal, legal_version, activo, requires_api_key, secret_name, default_model, docs_url, models)
VALUES (
  'gemini',
  'Google Gemini (BYOK)',
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  'Al activar Google Gemini con tu propia API key, los prompts sanitizados se envían a Google (política de privacidad de Google AI). El operador de CareCentral es responsable de la relación contractual con Google.',
  'v1',
  false,
  true,
  'GEMINI_API_KEY',
  'gemini-2.5-flash',
  'https://ai.google.dev/gemini-api/docs/openai',
  '[
    {"id":"gemini-2.5-pro","label":"Gemini 2.5 Pro"},
    {"id":"gemini-2.5-flash","label":"Gemini 2.5 Flash"},
    {"id":"gemini-2.5-flash-lite","label":"Gemini 2.5 Flash Lite"},
    {"id":"gemini-2.0-flash","label":"Gemini 2.0 Flash"},
    {"id":"gemini-2.0-flash-lite","label":"Gemini 2.0 Flash Lite"},
    {"id":"gemini-1.5-pro","label":"Gemini 1.5 Pro"},
    {"id":"gemini-1.5-flash","label":"Gemini 1.5 Flash"}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  endpoint = EXCLUDED.endpoint,
  aviso_legal = EXCLUDED.aviso_legal,
  requires_api_key = true,
  secret_name = EXCLUDED.secret_name,
  default_model = EXCLUDED.default_model,
  docs_url = EXCLUDED.docs_url,
  models = EXCLUDED.models,
  updated_at = now();

-- Seed: Mistral AI (BYOK)
INSERT INTO public.ai_external_providers (id, nombre, endpoint, aviso_legal, legal_version, activo, requires_api_key, secret_name, default_model, docs_url, models)
VALUES (
  'mistral',
  'Mistral AI (BYOK)',
  'https://api.mistral.ai/v1/chat/completions',
  'Al activar Mistral AI con tu propia API key, los prompts sanitizados se envían a servidores de Mistral (Francia/UE). El operador de CareCentral es responsable de la relación contractual con Mistral.',
  'v1',
  false,
  true,
  'MISTRAL_API_KEY',
  'mistral-small-latest',
  'https://docs.mistral.ai/api/',
  '[
    {"id":"mistral-large-latest","label":"Mistral Large"},
    {"id":"mistral-medium-latest","label":"Mistral Medium"},
    {"id":"mistral-small-latest","label":"Mistral Small"},
    {"id":"open-mistral-nemo","label":"Open Mistral Nemo"},
    {"id":"codestral-latest","label":"Codestral"},
    {"id":"ministral-8b-latest","label":"Ministral 8B"},
    {"id":"ministral-3b-latest","label":"Ministral 3B"}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  endpoint = EXCLUDED.endpoint,
  aviso_legal = EXCLUDED.aviso_legal,
  requires_api_key = true,
  secret_name = EXCLUDED.secret_name,
  default_model = EXCLUDED.default_model,
  docs_url = EXCLUDED.docs_url,
  models = EXCLUDED.models,
  updated_at = now();

-- Marcar ApiFreeLLM como no-BYOK explícitamente
UPDATE public.ai_external_providers
   SET requires_api_key = false,
       docs_url = COALESCE(docs_url, 'https://apifreellm.com/'),
       default_model = COALESCE(default_model, 'gpt-3.5-turbo')
 WHERE id = 'apifreellm';

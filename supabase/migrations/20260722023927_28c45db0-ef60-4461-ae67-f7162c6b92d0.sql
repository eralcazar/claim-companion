INSERT INTO public.ai_external_providers (id, nombre, endpoint, activo, requires_api_key, secret_name, default_model, docs_url, aviso_legal, models)
VALUES (
  'claude',
  'Anthropic Claude (BYOK)',
  'https://api.anthropic.com/v1/chat/completions',
  false,
  true,
  'ANTHROPIC_API_KEY',
  'claude-haiku-4-5',
  'https://docs.claude.com/en/api/openai-sdk',
  'Anthropic Claude vía endpoint compatible OpenAI. Requiere tu propia API key de console.anthropic.com. Los prompts sanitizados se envían a servidores de Anthropic (EE. UU.). La relación contractual con Anthropic es del operador de CareCentral.',
  '[
    {"id":"claude-opus-4-5","label":"Claude Opus 4.5 (máxima calidad)"},
    {"id":"claude-sonnet-4-5","label":"Claude Sonnet 4.5 (balanceado)"},
    {"id":"claude-haiku-4-5","label":"Claude Haiku 4.5 (rápido y económico)"},
    {"id":"claude-3-7-sonnet-latest","label":"Claude 3.7 Sonnet"},
    {"id":"claude-3-5-haiku-latest","label":"Claude 3.5 Haiku"}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  endpoint = EXCLUDED.endpoint,
  requires_api_key = EXCLUDED.requires_api_key,
  secret_name = EXCLUDED.secret_name,
  default_model = COALESCE(public.ai_external_providers.default_model, EXCLUDED.default_model),
  docs_url = EXCLUDED.docs_url,
  aviso_legal = EXCLUDED.aviso_legal,
  models = EXCLUDED.models;
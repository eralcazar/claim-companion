
-- 1. Tabla de políticas de IA por feature
CREATE TABLE public.ai_provider_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  max_input_tokens INTEGER NOT NULL DEFAULT 4000,
  max_output_tokens INTEGER NOT NULL DEFAULT 1200,
  history_window INTEGER NOT NULL DEFAULT 8,
  enable_cache BOOLEAN NOT NULL DEFAULT false,
  cache_ttl_hours INTEGER NOT NULL DEFAULT 720,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_provider_policy TO authenticated;
GRANT ALL ON public.ai_provider_policy TO service_role;
ALTER TABLE public.ai_provider_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_admin_read"
  ON public.ai_provider_policy FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "policy_admin_write"
  ON public.ai_provider_policy FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_provider_policy_updated
  BEFORE UPDATE ON public.ai_provider_policy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Caché semántico de respuestas
CREATE TABLE public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  prompt_normalized TEXT NOT NULL,
  response TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_saved INTEGER NOT NULL DEFAULT 0,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_hit_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  CONSTRAINT ai_response_cache_feature_hash_unique UNIQUE (feature_key, prompt_hash)
);

CREATE INDEX idx_ai_response_cache_lookup ON public.ai_response_cache (feature_key, prompt_hash, expires_at);

GRANT ALL ON public.ai_response_cache TO service_role;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Solo admins ven el caché desde la app (métricas). Nadie escribe desde app.
CREATE POLICY "cache_admin_read"
  ON public.ai_response_cache FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Políticas por defecto
INSERT INTO public.ai_provider_policy (feature_key, label, model, max_input_tokens, max_output_tokens, history_window, enable_cache, notes) VALUES
  ('kari_chat', 'Chat conversacional Kari', 'google/gemini-3-flash-preview', 6000, 1500, 8, true, 'Chat principal con caché para preguntas educativas genéricas.'),
  ('kari_summarize_history', 'Compresión de historial Kari', 'google/gemini-2.5-flash-lite', 4000, 400, 0, false, 'Llamada barata que resume mensajes previos cuando la conversación es larga.'),
  ('activity_coach', 'Coach de actividad física', 'google/gemini-2.5-flash-lite', 4000, 1500, 0, false, 'Contexto personal — no cachear.'),
  ('glossary', 'Definiciones y glosario médico', 'google/gemini-2.5-flash-lite', 1500, 600, 0, true, 'Ideal para caché: preguntas repetidas entre usuarios.'),
  ('study_summary', 'Resumen de estudios de laboratorio', 'google/gemini-2.5-flash', 4000, 1200, 0, false, 'Contexto clínico personal — no cachear.');

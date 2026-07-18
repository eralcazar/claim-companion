ALTER TABLE public.especialidad_busquedas
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_esp_busq_user_order
  ON public.especialidad_busquedas (user_id, pinned DESC, sort_order ASC, last_used_at DESC);
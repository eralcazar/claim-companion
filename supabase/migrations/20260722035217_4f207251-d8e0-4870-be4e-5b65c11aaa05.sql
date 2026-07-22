ALTER TABLE public.user_device_verifications
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS model_label text,
  ADD COLUMN IF NOT EXISTS marked_compatible boolean;
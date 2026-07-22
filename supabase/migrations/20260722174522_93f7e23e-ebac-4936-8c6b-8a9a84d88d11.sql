ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_tracking_mode text
    NOT NULL DEFAULT 'balanced'
    CHECK (location_tracking_mode IN ('balanced','high_accuracy','battery_saver'));
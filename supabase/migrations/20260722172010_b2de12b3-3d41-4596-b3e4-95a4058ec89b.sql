
-- 1. Add optional location columns to reading tables
ALTER TABLE public.blood_pressure_readings
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;

ALTER TABLE public.heart_rate_readings
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;

ALTER TABLE public.spo2_readings
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;

ALTER TABLE public.temperature_readings
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;

ALTER TABLE public.glucose_readings
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;

ALTER TABLE public.activity_readings
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz;

-- 2. Profile preferences
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_tagging_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_tracking_enabled boolean NOT NULL DEFAULT false;

-- 3. workout_routes
CREATE TABLE IF NOT EXISTS public.workout_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_session_id uuid,
  activity_type text NOT NULL DEFAULT 'walking',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  distance_m numeric NOT NULL DEFAULT 0,
  duration_s integer NOT NULL DEFAULT 0,
  avg_pace_s_per_km numeric,
  elevation_gain_m numeric,
  steps_estimated integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_routes TO authenticated;
GRANT ALL ON public.workout_routes TO service_role;

ALTER TABLE public.workout_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own routes"
  ON public.workout_routes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS workout_routes_user_started_idx
  ON public.workout_routes(user_id, started_at DESC);

-- 4. workout_route_points
CREATE TABLE IF NOT EXISTS public.workout_route_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.workout_routes(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  altitude_m numeric,
  speed_mps numeric,
  accuracy_m numeric,
  heading_deg numeric
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_route_points TO authenticated;
GRANT ALL ON public.workout_route_points TO service_role;

ALTER TABLE public.workout_route_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage points of their own routes"
  ON public.workout_route_points FOR ALL
  USING (EXISTS (SELECT 1 FROM public.workout_routes r WHERE r.id = route_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_routes r WHERE r.id = route_id AND r.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS workout_route_points_route_seq_idx
  ON public.workout_route_points(route_id, sequence);

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_workout_routes_updated_at ON public.workout_routes;
CREATE TRIGGER update_workout_routes_updated_at
  BEFORE UPDATE ON public.workout_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

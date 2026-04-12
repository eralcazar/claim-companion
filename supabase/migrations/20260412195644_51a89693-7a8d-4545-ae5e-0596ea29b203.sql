
-- Add detailed profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS paternal_surname text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS maternal_surname text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sex text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rfc text DEFAULT '',
  ADD COLUMN IF NOT EXISTS curp text DEFAULT '',
  ADD COLUMN IF NOT EXISTS street text DEFAULT '',
  ADD COLUMN IF NOT EXISTS street_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS interior_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS neighborhood text DEFAULT '',
  ADD COLUMN IF NOT EXISTS municipality text DEFAULT '',
  ADD COLUMN IF NOT EXISTS state text DEFAULT '',
  ADD COLUMN IF NOT EXISTS postal_code text DEFAULT '',
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'México',
  ADD COLUMN IF NOT EXISTS emergency_contact_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text DEFAULT '';

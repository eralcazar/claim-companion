ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_country TEXT DEFAULT 'México',
  ADD COLUMN IF NOT EXISTS birth_state TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Mexicana',
  ADD COLUMN IF NOT EXISTS occupation TEXT DEFAULT '';

ALTER TABLE public.insurance_policies
  ADD COLUMN IF NOT EXISTS policy_type TEXT DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS contractor_name TEXT DEFAULT '';
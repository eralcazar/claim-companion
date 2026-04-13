ALTER TABLE public.insurance_policies
  ADD COLUMN titular_paternal_surname text DEFAULT '',
  ADD COLUMN titular_maternal_surname text DEFAULT '',
  ADD COLUMN titular_first_name text DEFAULT '',
  ADD COLUMN titular_dob date,
  ADD COLUMN titular_birth_country text DEFAULT 'México',
  ADD COLUMN titular_birth_state text DEFAULT '',
  ADD COLUMN titular_nationality text DEFAULT 'Mexicana',
  ADD COLUMN titular_occupation text DEFAULT '';
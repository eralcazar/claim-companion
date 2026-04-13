ALTER TABLE public.profiles
  ADD COLUMN certificate_number text DEFAULT '',
  ADD COLUMN relationship_to_titular text DEFAULT '';
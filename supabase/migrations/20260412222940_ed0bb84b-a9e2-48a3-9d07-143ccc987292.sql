
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS form_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cause text DEFAULT 'enfermedad',
  ADD COLUMN IF NOT EXISTS symptom_start_date date,
  ADD COLUMN IF NOT EXISTS first_attention_date date,
  ADD COLUMN IF NOT EXISTS is_initial_claim boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS prior_claim_number text DEFAULT '';


ALTER TABLE public.insurance_policies
ADD COLUMN suma_asegurada numeric DEFAULT 0,
ADD COLUMN observaciones text DEFAULT '';

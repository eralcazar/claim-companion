-- Profiles: campos adicionales personales
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS giro_negocio text,
  ADD COLUMN IF NOT EXISTS es_pep boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cargo_pep text,
  ADD COLUMN IF NOT EXISTS tipo_identificacion text,
  ADD COLUMN IF NOT EXISTS numero_identificacion text,
  ADD COLUMN IF NOT EXISTS vigencia_identificacion date,
  ADD COLUMN IF NOT EXISTS telefono_celular text;

-- Insurance policies: campos adicionales de póliza y agente
ALTER TABLE public.insurance_policies
  ADD COLUMN IF NOT EXISTS numero_certificado text,
  ADD COLUMN IF NOT EXISTS tipo_contratacion text DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS deducible numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coaseguro_porcentaje numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tope_coaseguro numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agente_nombre text,
  ADD COLUMN IF NOT EXISTS agente_clave text,
  ADD COLUMN IF NOT EXISTS agente_telefono text,
  ADD COLUMN IF NOT EXISTS agente_estado text;
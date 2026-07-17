
-- ============ TABLA DE LLAVES ============
CREATE TABLE public.integrity_keys (
  key_id text PRIMARY KEY,
  algorithm text NOT NULL DEFAULT 'HMAC-SHA256',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  activated_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  created_by uuid,
  notes text
);
GRANT SELECT ON public.integrity_keys TO authenticated;
GRANT ALL ON public.integrity_keys TO service_role;
ALTER TABLE public.integrity_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gestionan llaves" ON public.integrity_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Autenticados leen metadata" ON public.integrity_keys
  FOR SELECT TO authenticated USING (true);

-- Solo puede haber una llave activa a la vez
CREATE UNIQUE INDEX integrity_keys_one_active ON public.integrity_keys(status) WHERE status = 'active';

-- ============ RAÍCES DIARIAS ============
CREATE TABLE public.integrity_daily_roots (
  day date PRIMARY KEY,
  medical_records_tip text,
  recetas_tip text,
  estudios_tip text,
  daily_root text NOT NULL,
  prev_daily_root text,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_ref text
);
GRANT SELECT ON public.integrity_daily_roots TO authenticated;
GRANT ALL ON public.integrity_daily_roots TO service_role;
ALTER TABLE public.integrity_daily_roots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados leen raices" ON public.integrity_daily_roots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gestionan raices" ON public.integrity_daily_roots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ COLUMNAS EN LAS 3 TABLAS ============
ALTER TABLE public.medical_records
  ADD COLUMN prev_hash text,
  ADD COLUMN payload_hash text,
  ADD COLUMN record_hash text,
  ADD COLUMN key_id text REFERENCES public.integrity_keys(key_id),
  ADD COLUMN signed_at timestamptz,
  ADD COLUMN signature text;
CREATE INDEX medical_records_chain_idx ON public.medical_records(created_at, id);

ALTER TABLE public.recetas
  ADD COLUMN prev_hash text,
  ADD COLUMN payload_hash text,
  ADD COLUMN record_hash text,
  ADD COLUMN key_id text REFERENCES public.integrity_keys(key_id),
  ADD COLUMN signed_at timestamptz,
  ADD COLUMN signature text;
CREATE INDEX recetas_chain_idx ON public.recetas(created_at, id);

ALTER TABLE public.estudios_solicitados
  ADD COLUMN prev_hash text,
  ADD COLUMN payload_hash text,
  ADD COLUMN record_hash text,
  ADD COLUMN key_id text REFERENCES public.integrity_keys(key_id),
  ADD COLUMN signed_at timestamptz,
  ADD COLUMN signature text;
CREATE INDEX estudios_chain_idx ON public.estudios_solicitados(created_at, id);

-- ============ CANONICAL JSON HELPER ============
CREATE OR REPLACE FUNCTION public.canonical_json(_row jsonb)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned jsonb;
  k text;
  keys text[];
  parts text[] := ARRAY[]::text[];
BEGIN
  cleaned := _row
    - 'updated_at' - 'signature' - 'record_hash' - 'prev_hash'
    - 'payload_hash' - 'key_id' - 'signed_at';
  SELECT array_agg(key ORDER BY key) INTO keys FROM jsonb_object_keys(cleaned) AS key;
  IF keys IS NULL THEN RETURN '{}'; END IF;
  FOREACH k IN ARRAY keys LOOP
    parts := parts || (to_json(k)::text || ':' || (cleaned->k)::text);
  END LOOP;
  RETURN '{' || array_to_string(parts, ',') || '}';
END;
$$;

-- ============ TRIGGER DE INSERT: calcula cadena ============
CREATE OR REPLACE FUNCTION public.apply_integrity_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev text;
  v_key text;
  v_payload text;
  v_signed_at timestamptz := now();
  v_record text;
BEGIN
  SELECT key_id INTO v_key FROM public.integrity_keys WHERE status = 'active' LIMIT 1;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'No hay llave de integridad activa';
  END IF;

  EXECUTE format(
    'SELECT record_hash FROM public.%I WHERE record_hash IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT 1',
    TG_TABLE_NAME
  ) INTO v_prev;
  v_prev := COALESCE(v_prev, 'GENESIS');

  v_payload := encode(digest(public.canonical_json(to_jsonb(NEW)), 'sha256'), 'hex');
  v_record := encode(digest(v_prev || v_payload || v_key || to_char(v_signed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'sha256'), 'hex');

  NEW.prev_hash := v_prev;
  NEW.payload_hash := v_payload;
  NEW.record_hash := v_record;
  NEW.key_id := v_key;
  NEW.signed_at := v_signed_at;
  NEW.signature := NULL; -- se firma async por edge function
  RETURN NEW;
END;
$$;

-- ============ TRIGGER DE UPDATE: bloqueo de campos de integridad ============
CREATE OR REPLACE FUNCTION public.enforce_integrity_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Permitir setear la signature una vez (de NULL a valor); resto inmutable
  IF OLD.record_hash IS NOT NULL AND NEW.record_hash IS DISTINCT FROM OLD.record_hash THEN
    RAISE EXCEPTION 'record_hash es inmutable';
  END IF;
  IF OLD.prev_hash IS NOT NULL AND NEW.prev_hash IS DISTINCT FROM OLD.prev_hash THEN
    RAISE EXCEPTION 'prev_hash es inmutable';
  END IF;
  IF OLD.payload_hash IS NOT NULL AND NEW.payload_hash IS DISTINCT FROM OLD.payload_hash THEN
    RAISE EXCEPTION 'payload_hash es inmutable';
  END IF;
  IF OLD.key_id IS NOT NULL AND NEW.key_id IS DISTINCT FROM OLD.key_id THEN
    RAISE EXCEPTION 'key_id es inmutable';
  END IF;
  IF OLD.signed_at IS NOT NULL AND NEW.signed_at IS DISTINCT FROM OLD.signed_at THEN
    RAISE EXCEPTION 'signed_at es inmutable';
  END IF;
  IF OLD.signature IS NOT NULL AND NEW.signature IS DISTINCT FROM OLD.signature THEN
    RAISE EXCEPTION 'signature es inmutable una vez firmada';
  END IF;
  RETURN NEW;
END;
$$;

-- Triggers en las 3 tablas
CREATE TRIGGER trg_integrity_medical_records_insert
  BEFORE INSERT ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.apply_integrity_chain();
CREATE TRIGGER trg_integrity_medical_records_update
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_integrity_immutability();

CREATE TRIGGER trg_integrity_recetas_insert
  BEFORE INSERT ON public.recetas
  FOR EACH ROW EXECUTE FUNCTION public.apply_integrity_chain();
CREATE TRIGGER trg_integrity_recetas_update
  BEFORE UPDATE ON public.recetas
  FOR EACH ROW EXECUTE FUNCTION public.enforce_integrity_immutability();

CREATE TRIGGER trg_integrity_estudios_insert
  BEFORE INSERT ON public.estudios_solicitados
  FOR EACH ROW EXECUTE FUNCTION public.apply_integrity_chain();
CREATE TRIGGER trg_integrity_estudios_update
  BEFORE UPDATE ON public.estudios_solicitados
  FOR EACH ROW EXECUTE FUNCTION public.enforce_integrity_immutability();

-- ============ SEED LLAVE INICIAL ============
INSERT INTO public.integrity_keys (key_id, algorithm, status, notes)
VALUES ('k-2026-07', 'HMAC-SHA256', 'active', 'Llave inicial de integridad Sprint 2');

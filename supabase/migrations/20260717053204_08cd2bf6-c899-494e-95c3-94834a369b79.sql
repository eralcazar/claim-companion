
CREATE OR REPLACE FUNCTION public.verify_record_hash(_table text, _id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row jsonb;
  v_payload text;
  v_record text;
  v_signed_str text;
BEGIN
  IF _table NOT IN ('medical_records','recetas','estudios_solicitados') THEN
    RAISE EXCEPTION 'tabla no permitida';
  END IF;

  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id = $1', _table) INTO row USING _id;
  IF row IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'status', 'not_found');
  END IF;
  IF row->>'record_hash' IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'status', 'unsigned');
  END IF;

  v_payload := encode(digest(public.canonical_json(row), 'sha256'), 'hex');
  v_signed_str := to_char((row->>'signed_at')::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  v_record := encode(digest((row->>'prev_hash') || v_payload || (row->>'key_id') || v_signed_str, 'sha256'), 'hex');

  RETURN jsonb_build_object(
    'valid', (v_payload = (row->>'payload_hash') AND v_record = (row->>'record_hash')),
    'payload_ok', v_payload = (row->>'payload_hash'),
    'chain_ok', v_record = (row->>'record_hash'),
    'has_signature', (row->>'signature') IS NOT NULL,
    'status', CASE
      WHEN v_payload = (row->>'payload_hash') AND v_record = (row->>'record_hash') THEN
        CASE WHEN (row->>'signature') IS NULL THEN 'pending_signature' ELSE 'verified' END
      ELSE 'broken' END,
    'key_id', row->>'key_id',
    'signed_at', row->>'signed_at',
    'record_hash', row->>'record_hash'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_record_hash(text, uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.pos_close_session(_session_id uuid, _fondo_final integer, _notas text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_session public.pos_sessions%ROWTYPE;
  v_efectivo integer := 0;
  v_tarjeta integer := 0;
  v_transferencia integer := 0;
  v_num integer := 0;
  v_esperado integer;
  v_diff integer;
BEGIN
  SELECT * INTO v_session FROM public.pos_sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND OR v_session.estado <> 'abierta' THEN
    RAISE EXCEPTION 'Sesión no encontrada o ya cerrada';
  END IF;
  IF v_session.cajero_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin'::app_role) AND NOT public.has_role(auth.uid(),'admin_farmacia'::app_role) THEN
    RAISE EXCEPTION 'No autorizado a cerrar esta sesión';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN metodo_pago='efectivo' THEN total_centavos ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN metodo_pago='tarjeta' THEN total_centavos ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN metodo_pago='transferencia' THEN total_centavos ELSE 0 END),0),
    COUNT(*)
  INTO v_efectivo, v_tarjeta, v_transferencia, v_num
  FROM public.pharmacy_orders
  WHERE tipo='pos' AND created_by = v_session.cajero_id
    AND branch_id = v_session.branch_id
    AND created_at >= v_session.abierta_at
    AND status IN ('pagada','surtida');

  v_esperado := v_session.fondo_inicial_centavos + v_efectivo;
  v_diff := COALESCE(_fondo_final, v_esperado) - v_esperado;

  UPDATE public.pos_sessions SET
    fondo_final_centavos = _fondo_final,
    ventas_efectivo_centavos = v_efectivo,
    ventas_tarjeta_centavos = v_tarjeta,
    ventas_transferencia_centavos = v_transferencia,
    total_ventas_centavos = v_efectivo + v_tarjeta + v_transferencia,
    num_ventas = v_num,
    arqueo_diferencia_centavos = v_diff,
    estado = 'cerrada',
    notas_cierre = _notas,
    cerrada_at = now(),
    updated_at = now()
  WHERE id = _session_id;

  RETURN jsonb_build_object(
    'esperado', v_esperado, 'contado', _fondo_final, 'diferencia', v_diff,
    'efectivo', v_efectivo, 'tarjeta', v_tarjeta, 'transferencia', v_transferencia,
    'num_ventas', v_num
  );
END $$;

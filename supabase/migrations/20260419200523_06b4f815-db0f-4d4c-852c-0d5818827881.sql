CREATE OR REPLACE FUNCTION public.gen_folio(_insurer text, _code text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  siglas text;
  yearmonth text;
  consecutivo int;
  v_folio text;
BEGIN
  siglas := upper(regexp_replace(_insurer, '[^A-Za-z]', '', 'g'));
  IF length(siglas) > 6 THEN siglas := substring(siglas, 1, 6); END IF;
  yearmonth := to_char(now(), 'YYYYMM');

  SELECT COALESCE(MAX(
    CAST(split_part(cf.folio, '-', 4) AS int)
  ), 0) + 1
  INTO consecutivo
  FROM public.claim_forms cf
  WHERE cf.folio LIKE siglas || '-' || _code || '-' || yearmonth || '-%';

  v_folio := siglas || '-' || _code || '-' || yearmonth || '-' || lpad(consecutivo::text, 4, '0');
  RETURN v_folio;
END;
$function$;
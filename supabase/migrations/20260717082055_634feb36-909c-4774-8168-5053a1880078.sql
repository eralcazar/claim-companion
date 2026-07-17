
CREATE TABLE public.professional_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.professional_locations(id) ON DELETE SET NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_minutes int NOT NULL DEFAULT 30 CHECK (slot_minutes BETWEEN 10 AND 240),
  modalidad text NOT NULL DEFAULT 'presencial' CHECK (modalidad IN ('presencial','video','domicilio')),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
GRANT SELECT ON public.professional_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_availability TO authenticated;
GRANT ALL ON public.professional_availability TO service_role;
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avail public read via published" ON public.professional_availability FOR SELECT
  USING (activo = true AND EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.publicado = true));
CREATE POLICY "avail owner all" ON public.professional_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid()));
CREATE POLICY "avail admin all" ON public.professional_availability FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX avail_prof_idx ON public.professional_availability (professional_id, weekday);
CREATE TRIGGER avail_updated_at BEFORE UPDATE ON public.professional_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.professional_availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('bloqueado','extra')),
  start_time time,
  end_time time,
  slot_minutes int DEFAULT 30,
  location_id uuid REFERENCES public.professional_locations(id) ON DELETE SET NULL,
  modalidad text CHECK (modalidad IN ('presencial','video','domicilio')),
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professional_availability_exceptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_availability_exceptions TO authenticated;
GRANT ALL ON public.professional_availability_exceptions TO service_role;
ALTER TABLE public.professional_availability_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avail_exc public read via published" ON public.professional_availability_exceptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.publicado = true));
CREATE POLICY "avail_exc owner all" ON public.professional_availability_exceptions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.professional_profiles pp WHERE pp.id = professional_id AND pp.user_id = auth.uid()));
CREATE POLICY "avail_exc admin all" ON public.professional_availability_exceptions FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX avail_exc_prof_idx ON public.professional_availability_exceptions (professional_id, fecha);
CREATE TRIGGER avail_exc_updated_at BEFORE UPDATE ON public.professional_availability_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_professional_slots(
  _professional_id uuid,
  _from date,
  _to date
) RETURNS TABLE(slot_start timestamptz, slot_end timestamptz, location_id uuid, modalidad text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid;
  v_day date;
  r record;
  v_slot timestamptz;
  v_end timestamptz;
BEGIN
  IF _to - _from > 60 THEN RAISE EXCEPTION 'Rango máximo 60 días'; END IF;

  SELECT user_id INTO v_user FROM public.professional_profiles
    WHERE id = _professional_id AND publicado = true;
  IF v_user IS NULL THEN RETURN; END IF;

  v_day := _from;
  WHILE v_day <= _to LOOP
    -- Bloqueos de día completo (sin start_time)
    IF NOT EXISTS (
      SELECT 1 FROM public.professional_availability_exceptions e
      WHERE e.professional_id = _professional_id
        AND e.fecha = v_day AND e.tipo = 'bloqueado'
        AND e.start_time IS NULL
    ) THEN
      -- Slots recurrentes
      FOR r IN
        SELECT a.start_time, a.end_time, a.slot_minutes, a.location_id, a.modalidad
          FROM public.professional_availability a
         WHERE a.professional_id = _professional_id
           AND a.activo = true
           AND a.weekday = EXTRACT(DOW FROM v_day)::int
      LOOP
        v_slot := (v_day::text || ' ' || r.start_time::text)::timestamptz;
        v_end := (v_day::text || ' ' || r.end_time::text)::timestamptz;
        WHILE v_slot + (r.slot_minutes || ' minutes')::interval <= v_end LOOP
          -- Bloqueo parcial
          IF NOT EXISTS (
            SELECT 1 FROM public.professional_availability_exceptions e
            WHERE e.professional_id = _professional_id
              AND e.fecha = v_day AND e.tipo = 'bloqueado'
              AND e.start_time IS NOT NULL
              AND v_slot::time >= e.start_time
              AND v_slot::time < e.end_time
          )
          -- No colisiona con cita existente
          AND NOT EXISTS (
            SELECT 1 FROM public.appointments ap
            WHERE ap.doctor_id = v_user
              AND ap.appointment_date >= v_slot
              AND ap.appointment_date < v_slot + (r.slot_minutes || ' minutes')::interval
          )
          -- No en el pasado
          AND v_slot > now()
          THEN
            slot_start := v_slot;
            slot_end := v_slot + (r.slot_minutes || ' minutes')::interval;
            location_id := r.location_id;
            modalidad := r.modalidad;
            RETURN NEXT;
          END IF;
          v_slot := v_slot + (r.slot_minutes || ' minutes')::interval;
        END LOOP;
      END LOOP;

      -- Slots extra
      FOR r IN
        SELECT e.start_time, e.end_time, COALESCE(e.slot_minutes,30) AS slot_minutes,
               e.location_id, COALESCE(e.modalidad,'presencial') AS modalidad
          FROM public.professional_availability_exceptions e
         WHERE e.professional_id = _professional_id
           AND e.fecha = v_day AND e.tipo = 'extra'
           AND e.start_time IS NOT NULL AND e.end_time IS NOT NULL
      LOOP
        v_slot := (v_day::text || ' ' || r.start_time::text)::timestamptz;
        v_end := (v_day::text || ' ' || r.end_time::text)::timestamptz;
        WHILE v_slot + (r.slot_minutes || ' minutes')::interval <= v_end LOOP
          IF NOT EXISTS (
            SELECT 1 FROM public.appointments ap
            WHERE ap.doctor_id = v_user
              AND ap.appointment_date >= v_slot
              AND ap.appointment_date < v_slot + (r.slot_minutes || ' minutes')::interval
          ) AND v_slot > now() THEN
            slot_start := v_slot;
            slot_end := v_slot + (r.slot_minutes || ' minutes')::interval;
            location_id := r.location_id;
            modalidad := r.modalidad;
            RETURN NEXT;
          END IF;
          v_slot := v_slot + (r.slot_minutes || ' minutes')::interval;
        END LOOP;
      END LOOP;
    END IF;
    v_day := v_day + 1;
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_professional_slots(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_professional_slots(uuid, date, date) TO anon, authenticated;

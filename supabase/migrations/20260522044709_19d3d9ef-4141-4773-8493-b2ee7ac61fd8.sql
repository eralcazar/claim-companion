
-- =========================================================
-- FASE 2 + FASE 3: Procedimientos recurrentes, Google Calendar,
-- Odontología, Nutricionista, Médico a domicilio, Facturación
-- =========================================================

-- Nuevos roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'odontologo';

-- ---------- FASE 2: Procedimientos recurrentes ----------
CREATE TABLE IF NOT EXISTS public.procedure_recurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  nombre text NOT NULL,
  categoria text NOT NULL DEFAULT 'hemodialisis', -- hemodialisis, quimioterapia, rehab, dialisis_peritoneal, otra
  ubicacion text,
  notas text,
  rrule text NOT NULL, -- p.ej. FREQ=WEEKLY;BYDAY=MO,WE,FR
  hora_inicio time NOT NULL DEFAULT '09:00',
  duracion_min integer NOT NULL DEFAULT 240,
  fecha_inicio date NOT NULL DEFAULT current_date,
  fecha_fin date,
  vigente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.procedure_recurrences ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.procedure_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_id uuid REFERENCES public.procedure_recurrences(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'programada', -- programada, completada, cancelada, no_asistio
  como_me_fue text,
  sintomas text,
  peso_pre_kg numeric,
  peso_post_kg numeric,
  presion_pre text,
  presion_post text,
  complicaciones text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.procedure_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: paciente y personal con acceso pueden ver; solo el creador (o admin) puede editar
CREATE POLICY "rec_select" ON public.procedure_recurrences FOR SELECT TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "rec_insert" ON public.procedure_recurrences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "rec_update_own" ON public.procedure_recurrences FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "rec_delete_own" ON public.procedure_recurrences FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "ses_select" ON public.procedure_sessions FOR SELECT TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "ses_insert" ON public.procedure_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "ses_update_own" ON public.procedure_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "ses_delete_own" ON public.procedure_sessions FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_rec_updated BEFORE UPDATE ON public.procedure_recurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ses_updated BEFORE UPDATE ON public.procedure_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit triggers
CREATE TRIGGER trg_rec_audit AFTER INSERT OR UPDATE OR DELETE ON public.procedure_recurrences
  FOR EACH ROW EXECUTE FUNCTION public.log_clinical_change();
CREATE TRIGGER trg_ses_audit AFTER INSERT OR UPDATE OR DELETE ON public.procedure_sessions
  FOR EACH ROW EXECUTE FUNCTION public.log_clinical_change();

-- ---------- Google Calendar tokens per-user ----------
CREATE TABLE IF NOT EXISTS public.user_google_tokens (
  user_id uuid PRIMARY KEY,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  calendar_id text DEFAULT 'primary',
  sync_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gt_own" ON public.user_google_tokens FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mapeo evento → cita/sesión para evitar duplicados
CREATE TABLE IF NOT EXISTS public.google_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  google_event_id text NOT NULL,
  source_table text NOT NULL, -- 'appointments' | 'procedure_sessions'
  source_id uuid NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_table, source_id)
);
ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gce_own" ON public.google_calendar_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- FASE 3: Odontología ----------
CREATE TABLE IF NOT EXISTS public.odontograma_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  pieza int NOT NULL, -- FDI 11-48
  superficie text, -- vestibular, lingual, mesial, distal, oclusal, incisal
  estado text NOT NULL, -- sano, caries, obturado, ausente, corona, implante, fractura, endodoncia
  color text,
  notas text,
  vigente boolean NOT NULL DEFAULT true,
  superseded_by uuid REFERENCES public.odontograma_states(id) ON DELETE SET NULL,
  superseded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.odontograma_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "odo_select" ON public.odontograma_states FOR SELECT TO authenticated
  USING (public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "odo_insert" ON public.odontograma_states FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.has_patient_access(auth.uid(), patient_id));
CREATE POLICY "odo_update_own" ON public.odontograma_states FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "odo_delete_own" ON public.odontograma_states FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_odo_updated BEFORE UPDATE ON public.odontograma_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_odo_audit AFTER INSERT OR UPDATE OR DELETE ON public.odontograma_states
  FOR EACH ROW EXECUTE FUNCTION public.log_clinical_change();

-- ---------- FASE 3: Perfil Nutricionista ----------
CREATE TABLE IF NOT EXISTS public.nutricionista_profiles (
  user_id uuid PRIMARY KEY,
  cedula text,
  especialidad text,
  bio text,
  consultorio text,
  precio_consulta numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nutricionista_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nut_select_all" ON public.nutricionista_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "nut_own_write" ON public.nutricionista_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- FASE 3: Médico a domicilio ----------
CREATE TABLE IF NOT EXISTS public.home_visit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  doctor_id uuid,
  motivo text NOT NULL,
  urgencia text NOT NULL DEFAULT 'normal', -- normal, urgente, critica
  direccion text NOT NULL,
  lat double precision,
  lng double precision,
  fecha_preferida timestamptz,
  estado text NOT NULL DEFAULT 'pendiente', -- pendiente, aceptada, en_camino, completada, cancelada
  notas text,
  precio_estimado numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.home_visit_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hvr_select" ON public.home_visit_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = requested_by
    OR auth.uid() = doctor_id
    OR public.has_patient_access(auth.uid(), patient_id)
    OR (doctor_id IS NULL AND public.has_role(auth.uid(),'medico'::app_role))
  );
CREATE POLICY "hvr_insert" ON public.home_visit_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "hvr_update_own" ON public.home_visit_requests FOR UPDATE TO authenticated
  USING (auth.uid() = requested_by OR auth.uid() = doctor_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "hvr_delete_own" ON public.home_visit_requests FOR DELETE TO authenticated
  USING (auth.uid() = requested_by OR public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_hvr_updated BEFORE UPDATE ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_hvr_audit AFTER INSERT OR UPDATE OR DELETE ON public.home_visit_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_clinical_change();

-- ---------- FASE 3: Facturación médica ----------
CREATE TABLE IF NOT EXISTS public.medico_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_id uuid,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  home_visit_id uuid REFERENCES public.home_visit_requests(id) ON DELETE SET NULL,
  folio text NOT NULL,
  fecha date NOT NULL DEFAULT current_date,
  concepto text NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  iva numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  rfc_receptor text,
  razon_social_receptor text,
  metodo_pago text,
  estado text NOT NULL DEFAULT 'borrador', -- borrador, emitida, cancelada
  pdf_url text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medico_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_select" ON public.medico_invoices FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR auth.uid() = patient_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "inv_insert" ON public.medico_invoices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "inv_update_own" ON public.medico_invoices FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "inv_delete_own" ON public.medico_invoices FOR DELETE TO authenticated
  USING (auth.uid() = doctor_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.medico_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Folio auto
CREATE OR REPLACE FUNCTION public.gen_invoice_folio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year text := to_char(now(),'YYYY');
  v_n int;
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    SELECT COALESCE(MAX(CAST(split_part(folio,'-',3) AS int)),0)+1
      INTO v_n
      FROM public.medico_invoices
      WHERE doctor_id = NEW.doctor_id AND folio LIKE 'INV-'||v_year||'-%';
    NEW.folio := 'INV-'||v_year||'-'||lpad(v_n::text,5,'0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_inv_folio BEFORE INSERT ON public.medico_invoices
  FOR EACH ROW EXECUTE FUNCTION public.gen_invoice_folio();

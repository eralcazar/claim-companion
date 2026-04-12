
CREATE TYPE public.app_role AS ENUM ('admin', 'broker', 'paciente', 'medico');
CREATE TYPE public.claim_status AS ENUM ('pendiente', 'aprobado', 'rechazado', 'en_revision');
CREATE TYPE public.claim_type AS ENUM ('reembolso', 'procedimiento_programado');
CREATE TYPE public.policy_status AS ENUM ('activa', 'inactiva');
CREATE TYPE public.appointment_type AS ENUM ('consulta', 'estudio', 'procedimiento');
CREATE TYPE public.medical_record_type AS ENUM ('receta', 'laboratorio', 'documento');
CREATE TYPE public.medication_frequency AS ENUM ('diario', 'cada_8_horas', 'cada_12_horas', 'cada_24_horas', 'semanal');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.broker_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broker_id, patient_id)
);
ALTER TABLE public.broker_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers can view own assignments" ON public.broker_patients FOR SELECT USING (auth.uid() = broker_id);
CREATE POLICY "Patients can view own broker" ON public.broker_patients FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Admins can manage assignments" ON public.broker_patients FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  date_of_birth DATE,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Brokers can view assigned profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = profiles.user_id));
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company TEXT NOT NULL DEFAULT 'MetLife',
  policy_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status policy_status NOT NULL DEFAULT 'activa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own policies" ON public.insurance_policies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own policies" ON public.insurance_policies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own policies" ON public.insurance_policies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own policies" ON public.insurance_policies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Brokers can view assigned policies" ON public.insurance_policies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = insurance_policies.user_id));
CREATE POLICY "Admins can view all policies" ON public.insurance_policies FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.insurance_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  claim_type claim_type NOT NULL,
  incident_date DATE NOT NULL,
  diagnosis TEXT NOT NULL,
  treatment TEXT NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  status claim_status NOT NULL DEFAULT 'pendiente',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own claims" ON public.claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own claims" ON public.claims FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Brokers can view assigned claims" ON public.claims FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = claims.user_id));
CREATE POLICY "Brokers can update assigned claims" ON public.claims FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'broker') AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = claims.user_id));
CREATE POLICY "Admins can manage all claims" ON public.claims FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.claim_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'documento',
  file_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own claim docs" ON public.claim_documents FOR SELECT USING (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_documents.claim_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own claim docs" ON public.claim_documents FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_documents.claim_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins can manage claim docs" ON public.claim_documents FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type medical_record_type NOT NULL,
  file_path TEXT NOT NULL,
  description TEXT DEFAULT '',
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own records" ON public.medical_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own records" ON public.medical_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own records" ON public.medical_records FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all records" ON public.medical_records FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id),
  appointment_date TIMESTAMPTZ NOT NULL,
  appointment_type appointment_type NOT NULL DEFAULT 'consulta',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own appointments" ON public.appointments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Doctors can view assigned appts" ON public.appointments FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Admins can view all appointments" ON public.appointments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency medication_frequency NOT NULL DEFAULT 'diario',
  start_date DATE NOT NULL,
  end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meds" ON public.medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meds" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meds" ON public.medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meds" ON public.medications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all meds" ON public.medications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', ''), COALESCE(NEW.email, ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'paciente');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
CREATE POLICY "Users can upload own docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own docs" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own docs" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

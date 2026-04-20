-- claims: INSERT for brokers
CREATE POLICY "Brokers can insert claims for assigned"
ON public.claims FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = claims.user_id)
);

-- claim_forms: INSERT and UPDATE for brokers
CREATE POLICY "Brokers can insert claim_forms for assigned"
ON public.claim_forms FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = claim_forms.user_id)
);

CREATE POLICY "Brokers can update claim_forms for assigned"
ON public.claim_forms FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = claim_forms.user_id)
);

-- insurance_policies: INSERT and UPDATE for brokers
CREATE POLICY "Brokers can insert policies for assigned"
ON public.insurance_policies FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = insurance_policies.user_id)
);

CREATE POLICY "Brokers can update policies for assigned"
ON public.insurance_policies FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = insurance_policies.user_id)
);

-- appointments: SELECT, INSERT, UPDATE, DELETE for brokers
CREATE POLICY "Brokers can view appointments for assigned"
ON public.appointments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = appointments.user_id)
);

CREATE POLICY "Brokers can insert appointments for assigned"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = appointments.user_id)
);

CREATE POLICY "Brokers can update appointments for assigned"
ON public.appointments FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = appointments.user_id)
);

CREATE POLICY "Brokers can delete appointments for assigned"
ON public.appointments FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = appointments.user_id)
);

-- medications: SELECT, INSERT, UPDATE, DELETE for brokers
CREATE POLICY "Brokers can view meds for assigned"
ON public.medications FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = medications.user_id)
);

CREATE POLICY "Brokers can insert meds for assigned"
ON public.medications FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = medications.user_id)
);

CREATE POLICY "Brokers can update meds for assigned"
ON public.medications FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = medications.user_id)
);

CREATE POLICY "Brokers can delete meds for assigned"
ON public.medications FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = medications.user_id)
);

-- medical_records: SELECT, INSERT, UPDATE, DELETE for brokers
CREATE POLICY "Brokers can view records for assigned"
ON public.medical_records FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = medical_records.user_id)
);

CREATE POLICY "Brokers can insert records for assigned"
ON public.medical_records FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = medical_records.user_id)
);

CREATE POLICY "Brokers can update records for assigned"
ON public.medical_records FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = medical_records.user_id)
);

CREATE POLICY "Brokers can delete records for assigned"
ON public.medical_records FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'broker'::app_role)
  AND EXISTS (SELECT 1 FROM public.broker_patients bp WHERE bp.broker_id = auth.uid() AND bp.patient_id = medical_records.user_id)
);

-- broker_patients: ensure one broker per patient (unique on patient_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_broker_patients_unique_patient ON public.broker_patients(patient_id);
import type { Database } from "@/integrations/supabase/types";

export type ClaimType = Database["public"]["Enums"]["claim_type"];

export interface ClaimFormData {
  // Step 1: Type
  claim_type: ClaimType | "";
  // Step 2: Policy selection
  policy_id: string;

  // Common fields
  is_initial_claim: boolean;
  prior_claim_number: string;
  cause: "accidente" | "enfermedad" | "embarazo";
  incident_date: string;
  symptom_start_date: string;
  first_attention_date: string;
  diagnosis: string;
  treatment: string;
  total_cost: string;
  notes: string;

  // Patient affected (if different from titular)
  patient_is_titular: boolean;
  patient_first_name: string;
  patient_paternal_surname: string;
  patient_maternal_surname: string;
  patient_dob: string;
  patient_birth_country: string;
  patient_birth_state: string;
  patient_occupation: string;
  patient_certificate_number: string;
  patient_relationship: string;

  // Datos complementarios (MetLife sections 5-6)
  has_other_active_policy: boolean;
  other_active_policy_name: string;
  had_prior_insurance: boolean;
  prior_insurance_company: string;
  prior_insurance_start: string;
  has_current_other_insurance: boolean;
  current_other_company: string;
  current_other_start: string;
  current_other_end: string;
  has_prior_metlife_claims: boolean;
  prior_metlife_siniestro: string;
  is_pep: boolean;
  is_sending_prior_info: boolean;
  prior_dcn_folio: string;
  authority_knowledge: boolean;
  authority_name: string;

  // Insurer-specific (stored in form_data JSON)
  prior_company: string;
  has_prior_claims: boolean;
  accident_description: string;
  hospital_name: string;
  hospital_address: string;
  admission_date: string;
  discharge_date: string;
  hospitalization_days: string;
  lab_studies: string;

  // Payment (reembolso only)
  payment_method: "transferencia" | "cheque" | "";
  bank_name: string;
  clabe: string;

  // Invoices (reembolso only)
  invoices: Invoice[];

  // Programación fields
  surgeon_name: string;
  surgeon_specialty: string;
  surgeon_license: string;
  surgery_hospital: string;
  surgery_date: string;
  procedure_description: string;
}

export interface Invoice {
  number: string;
  provider: string;
  amount: string;
  concept: "hospital" | "honorarios" | "farmacia" | "otros";
}

export const defaultFormData: ClaimFormData = {
  claim_type: "",
  policy_id: "",
  is_initial_claim: true,
  prior_claim_number: "",
  cause: "enfermedad",
  incident_date: "",
  symptom_start_date: "",
  first_attention_date: "",
  diagnosis: "",
  treatment: "",
  total_cost: "",
  notes: "",

  patient_is_titular: true,
  patient_first_name: "",
  patient_paternal_surname: "",
  patient_maternal_surname: "",
  patient_dob: "",
  patient_birth_country: "",
  patient_birth_state: "",
  patient_occupation: "",
  patient_certificate_number: "",
  patient_relationship: "",

  has_other_active_policy: false,
  other_active_policy_name: "",
  had_prior_insurance: false,
  prior_insurance_company: "",
  prior_insurance_start: "",
  has_current_other_insurance: false,
  current_other_company: "",
  current_other_start: "",
  current_other_end: "",
  has_prior_metlife_claims: false,
  prior_metlife_siniestro: "",
  is_pep: false,
  is_sending_prior_info: false,
  prior_dcn_folio: "",
  authority_knowledge: false,
  authority_name: "",

  prior_company: "",
  has_prior_claims: false,
  accident_description: "",
  hospital_name: "",
  hospital_address: "",
  admission_date: "",
  discharge_date: "",
  hospitalization_days: "",
  lab_studies: "",
  payment_method: "",
  bank_name: "",
  clabe: "",
  invoices: [],
  surgeon_name: "",
  surgeon_specialty: "",
  surgeon_license: "",
  surgery_hospital: "",
  surgery_date: "",
  procedure_description: "",
};

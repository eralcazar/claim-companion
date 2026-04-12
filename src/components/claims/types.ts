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

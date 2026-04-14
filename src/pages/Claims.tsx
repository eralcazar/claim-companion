import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Download, FileDown, Pencil } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { defaultFormData, type ClaimFormData } from "@/components/claims/types";
import { generateClaimPDF } from "@/components/claims/generateClaimPDF";
import { fillOriginalPDF } from "@/components/claims/fillOriginalPDF";

function claimToFormData(claim: any): ClaimFormData {
  const fd = claim.form_data || {};
  return {
    ...defaultFormData,
    claim_type: claim.claim_type || "",
    policy_id: claim.policy_id || "",
    is_initial_claim: claim.is_initial_claim ?? true,
    prior_claim_number: claim.prior_claim_number || "",
    cause: claim.cause || "enfermedad",
    incident_date: claim.incident_date || "",
    symptom_start_date: claim.symptom_start_date || "",
    first_attention_date: claim.first_attention_date || "",
    diagnosis: claim.diagnosis || "",
    treatment: claim.treatment || "",
    total_cost: String(claim.total_cost || ""),
    notes: claim.notes || "",
    patient_is_titular: fd.patient_is_titular ?? true,
    patient_first_name: fd.patient_first_name || "",
    patient_paternal_surname: fd.patient_paternal_surname || "",
    patient_maternal_surname: fd.patient_maternal_surname || "",
    patient_dob: fd.patient_dob || "",
    patient_birth_country: fd.patient_birth_country || "",
    patient_birth_state: fd.patient_birth_state || "",
    patient_occupation: fd.patient_occupation || "",
    patient_certificate_number: fd.patient_certificate_number || "",
    patient_relationship: fd.patient_relationship || "",
    has_other_active_policy: fd.has_other_active_policy ?? false,
    other_active_policy_name: fd.other_active_policy_name || "",
    had_prior_insurance: fd.had_prior_insurance ?? false,
    prior_insurance_company: fd.prior_insurance_company || "",
    prior_insurance_start: fd.prior_insurance_start || "",
    has_current_other_insurance: fd.has_current_other_insurance ?? false,
    current_other_company: fd.current_other_company || "",
    current_other_start: fd.current_other_start || "",
    current_other_end: fd.current_other_end || "",
    has_prior_metlife_claims: fd.has_prior_metlife_claims ?? false,
    prior_metlife_siniestro: fd.prior_metlife_siniestro || "",
    is_pep: fd.is_pep ?? false,
    is_sending_prior_info: fd.is_sending_prior_info ?? false,
    prior_dcn_folio: fd.prior_dcn_folio || "",
    authority_knowledge: fd.authority_knowledge ?? false,
    authority_name: fd.authority_name || "",
    prior_company: fd.prior_company || "",
    has_prior_claims: fd.has_prior_claims ?? false,
    accident_description: fd.accident_description || "",
    hospital_name: fd.hospital_name || "",
    hospital_address: fd.hospital_address || "",
    admission_date: fd.admission_date || "",
    discharge_date: fd.discharge_date || "",
    hospitalization_days: fd.hospitalization_days || "",
    lab_studies: fd.lab_studies || "",
    payment_method: fd.payment_method || "",
    bank_name: fd.bank_name || "",
    clabe: fd.clabe || "",
    invoices: fd.invoices || [],
    surgeon_name: fd.surgeon_name || "",
    surgeon_specialty: fd.surgeon_specialty || "",
    surgeon_license: fd.surgeon_license || "",
    surgery_hospital: fd.surgery_hospital || "",
    surgery_date: fd.surgery_date || "",
    procedure_description: fd.procedure_description || "",
  };
}

export default function Claims() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: claims, isLoading } = useQuery({
    queryKey: ["claims", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("claims")
        .select("*, insurance_policies(company, policy_number, policy_type, contractor_name, titular_paternal_surname, titular_maternal_surname, titular_first_name, titular_dob, titular_birth_country, titular_birth_state, titular_nationality, titular_occupation, titular_rfc, titular_street, titular_ext_number, titular_int_number, titular_postal_code, titular_neighborhood, titular_municipality, titular_city, titular_state, titular_country, titular_cell_phone, titular_landline, titular_intl_prefix, titular_email, titular_auth_contact)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const claimTypeLabel: Record<string, string> = {
    reembolso: "Reembolso",
    procedimiento_programado: "Proc. Programado",
  };

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pendiente: "secondary",
    aprobado: "default",
    rechazado: "destructive",
    en_revision: "outline",
  };

  const statusLabel: Record<string, string> = {
    pendiente: "Pendiente",
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    en_revision: "En revisión",
  };

  const handleDownloadPDF = (claim: any) => {
    if (!profile) return;
    const pol = (claim as any).insurance_policies;
    if (!pol) return;
    const form = claimToFormData(claim);
    const doc = generateClaimPDF(form, profile, {
      policy_number: pol.policy_number,
      company: pol.company,
    });
    const fileName = `${pol.company.replace(/\s/g, "_")}_Resumen_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF resumen descargado");
  };

  const handleDownloadOriginalPDF = async (claim: any) => {
    if (!profile) return;
    const pol = (claim as any).insurance_policies;
    if (!pol) return;
    const form = claimToFormData(claim);
    try {
      const pdfBytes = await fillOriginalPDF(form, profile, {
        policy_number: pol.policy_number,
        company: pol.company,
        policy_type: pol.policy_type,
        contractor_name: pol.contractor_name,
        titular_paternal_surname: pol.titular_paternal_surname,
        titular_maternal_surname: pol.titular_maternal_surname,
        titular_first_name: pol.titular_first_name,
        titular_dob: pol.titular_dob,
        titular_birth_country: pol.titular_birth_country,
        titular_birth_state: pol.titular_birth_state,
        titular_nationality: pol.titular_nationality,
        titular_occupation: pol.titular_occupation,
        titular_rfc: pol.titular_rfc,
        titular_street: pol.titular_street,
        titular_ext_number: pol.titular_ext_number,
        titular_int_number: pol.titular_int_number,
        titular_postal_code: pol.titular_postal_code,
        titular_neighborhood: pol.titular_neighborhood,
        titular_municipality: pol.titular_municipality,
        titular_city: pol.titular_city,
        titular_state: pol.titular_state,
        titular_country: pol.titular_country,
        titular_cell_phone: pol.titular_cell_phone,
        titular_landline: pol.titular_landline,
        titular_intl_prefix: pol.titular_intl_prefix,
        titular_email: pol.titular_email,
        titular_auth_contact: pol.titular_auth_contact,
      });
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const isReembolso = claim.claim_type === "reembolso";
      a.download = `${pol.company.replace(/\s/g, "_")}_Formato_Oficial_${isReembolso ? "Reembolso" : "Programacion"}_${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Formato oficial descargado");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el formato oficial");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Mis Reclamos</h1>
        <Button size="sm" onClick={() => navigate("/reclamos/nuevo")}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : claims?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No tienes reclamos</CardContent></Card>
      ) : (
        claims?.map((claim) => (
          <Card key={claim.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {claim.diagnosis}
                </CardTitle>
                <Badge variant={statusVariant[claim.status]}>
                  {statusLabel[claim.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {(claim as any).insurance_policies?.company} — {(claim as any).insurance_policies?.policy_number}
              </p>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Costo: ${Number(claim.total_cost).toLocaleString()}</span>
                <span>{format(new Date(claim.created_at), "PP", { locale: es })}</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/reclamos/editar/${claim.id}`)}
                >
                  <Pencil className="h-3 w-3 mr-1" /> Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadOriginalPDF(claim)}
                >
                  <FileDown className="h-3 w-3 mr-1" /> Formato
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPDF(claim)}
                >
                  <Download className="h-3 w-3 mr-1" /> Resumen
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

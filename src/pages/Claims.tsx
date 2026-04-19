import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Download, FileDown, Pencil, FileEdit, Trash2, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { defaultFormData, type ClaimFormData } from "@/components/claims/types";
import { generateClaimPDF } from "@/components/claims/generateClaimPDF";
import { fillOriginalPDF } from "@/components/claims/fillOriginalPDF";
import { TRAMITE_TYPES, type TramiteType } from "@/lib/constants";
import { getFormKey } from "@/components/claims/forms/registry";
import {
  generateFilledPDF,
  downloadPDF,
  buildOverlayData,
} from "@/lib/generateFilledPDF";
import type { FormCoordinatesKey } from "@/lib/formCoordinates";

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
  const queryClient = useQueryClient();

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

  const { data: claimForms, isLoading: loadingForms, refetch: refetchForms } = useQuery({
    queryKey: ["claim_forms", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("claim_forms")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const drafts = (claimForms || []).filter((f: any) => f.status === "draft");
  const submitted = (claimForms || []).filter((f: any) => f.status === "submitted");

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
    const insurer = (pol.company || "").toUpperCase();
    // El reclamo legacy no tiene tramite_type explícito;
    // mapear claim_type → tramite del nuevo sistema.
    const tramite: TramiteType =
      claim.claim_type === "reembolso" ? "reembolso" : "prog_cirugia";
    const formKey = getFormKey(insurer, tramite) as FormCoordinatesKey | null;

    if (!formKey) {
      toast.error(`No hay formato oficial configurado para ${pol.company}`);
      return;
    }

    try {
      // Construir overlay con los datos del reclamo + perfil + póliza
      const overlay = buildOverlayData({
        data: {
          ...(claim.form_data || {}),
          policy_number: pol.policy_number,
          numero_certificado: pol.numero_certificado,
          diagnosis: claim.diagnosis,
          treatment: claim.treatment,
          cause: claim.cause,
          incident_date: claim.incident_date,
          total_cost: claim.total_cost,
          is_initial_claim: claim.is_initial_claim,
          prior_claim_number: claim.prior_claim_number,
        },
        profile,
        policy: pol,
        insurer,
        tramite,
      });
      const pdfBytes = await generateFilledPDF(formKey, overlay);
      const fileName = `${pol.company.replace(/\s/g, "_")}_Formato_Oficial_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      downloadPDF(pdfBytes, fileName);
      toast.success("Formato oficial descargado");
    } catch (err: any) {
      console.error("[handleDownloadOriginalPDF]", err);
      toast.error(err?.message || "Error al generar el formato oficial");
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("¿Eliminar este borrador?")) return;
    const { error } = await supabase.from("claim_forms").delete().eq("id", id);
    if (error) toast.error("Error al eliminar");
    else { toast.success("Borrador eliminado"); refetchForms(); }
  };

  const handleDeleteClaim = async (id: string) => {
    if (!confirm("¿Eliminar este reclamo? Esta acción no se puede deshacer.")) return;
    await supabase.from("claim_documents").delete().eq("claim_id", id);
    const { error } = await supabase.from("claims").delete().eq("id", id);
    if (error) toast.error("Error al eliminar el reclamo");
    else {
      toast.success("Reclamo eliminado");
      queryClient.invalidateQueries({ queryKey: ["claims", user?.id] });
    }
  };

  const handleDownloadSubmittedPDF = async (form: any) => {
    if (!form.pdf_path) { toast.error("PDF no disponible"); return; }
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(form.pdf_path, 60);
    if (error || !data?.signedUrl) { toast.error("Error al obtener PDF"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const tramiteLabel = (t: string) => TRAMITE_TYPES.find((x) => x.value === t)?.label || t;

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Mis Reclamos</h1>
        <Button size="sm" onClick={() => navigate("/reclamos/nuevo")}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      <Tabs defaultValue="claims" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="claims">Reclamos {claims?.length ? `(${claims.length})` : ""}</TabsTrigger>
          <TabsTrigger value="drafts">Borradores {drafts.length ? `(${drafts.length})` : ""}</TabsTrigger>
          <TabsTrigger value="submitted">Enviados {submitted.length ? `(${submitted.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : claims?.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No tienes reclamos</CardContent></Card>
          ) : (
            claims?.map((claim) => (
              <Card key={claim.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {claim.diagnosis}
                    </CardTitle>
                    <Badge variant={statusVariant[claim.status]}>{statusLabel[claim.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {(claim as any).insurance_policies?.company} — {(claim as any).insurance_policies?.policy_number}
                    </p>
                    <Badge variant="outline" className="text-xs bg-accent">
                      {claimTypeLabel[claim.claim_type] || claim.claim_type}
                    </Badge>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Costo: ${Number(claim.total_cost).toLocaleString()}</span>
                    <span>{format(new Date(claim.created_at), "PP", { locale: es })}</span>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/reclamos/editar/${claim.id}`)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadOriginalPDF(claim)}>
                      <FileDown className="h-3 w-3 mr-1" /> Formato
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(claim)}>
                      <Download className="h-3 w-3 mr-1" /> Resumen
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClaim(claim.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="drafts" className="space-y-3 mt-4">
          {loadingForms ? (
            <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : drafts.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No tienes borradores</CardContent></Card>
          ) : (
            drafts.map((d: any) => (
              <Card key={d.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileEdit className="h-4 w-4 text-primary" />
                      {d.insurer} · Formato {d.form_code}
                    </CardTitle>
                    <Badge variant="secondary">Borrador</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{tramiteLabel(d.tramite_type)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Actualizado {format(new Date(d.updated_at), "PPp", { locale: es })}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/reclamos/nuevo?draft=${d.id}`)}>
                      <Pencil className="h-3 w-3 mr-1" /> Continuar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteDraft(d.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="submitted" className="space-y-3 mt-4">
          {loadingForms ? (
            <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : submitted.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No tienes formatos enviados</CardContent></Card>
          ) : (
            submitted.map((s: any) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-primary" />
                      {s.folio || `Formato ${s.form_code}`}
                    </CardTitle>
                    <Badge>Enviado</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {s.insurer} · {tramiteLabel(s.tramite_type)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generado {format(new Date(s.updated_at), "PPp", { locale: es })}
                  </p>
                  {s.pdf_path && (
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => handleDownloadSubmittedPDF(s)}>
                        <Download className="h-3 w-3 mr-1" /> Descargar PDF
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

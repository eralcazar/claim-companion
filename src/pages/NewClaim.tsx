import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Download } from "lucide-react";
import { defaultFormData, type ClaimFormData, type ClaimType } from "@/components/claims/types";
import StepClaimType from "@/components/claims/StepClaimType";
import StepPolicySelect from "@/components/claims/StepPolicySelect";
import StepMedicalInfo from "@/components/claims/StepMedicalInfo";
import StepHospitalInfo from "@/components/claims/StepHospitalInfo";
import StepInvoices from "@/components/claims/StepInvoices";
import StepPayment from "@/components/claims/StepPayment";
import StepSurgeryInfo from "@/components/claims/StepSurgeryInfo";
import StepReview from "@/components/claims/StepReview";
import { generateClaimPDF } from "@/components/claims/generateClaimPDF";

export default function NewClaim() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ClaimFormData>({ ...defaultFormData });

  const onChange = (updates: Partial<ClaimFormData>) => setForm((f) => ({ ...f, ...updates }));

  const { data: policies } = useQuery({
    queryKey: ["policies-active", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "activa");
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

  const selectedPolicy = policies?.find((p) => p.id === form.policy_id);
  const company = selectedPolicy?.company || "";
  const isReembolso = form.claim_type === "reembolso";

  // Build steps dynamically based on company + claim type
  const buildSteps = () => {
    const steps: { title: string; content: React.ReactNode; valid: boolean }[] = [];

    // 1. Claim type
    steps.push({
      title: "Tipo de Reclamo",
      content: <StepClaimType form={form} onChange={onChange} />,
      valid: !!form.claim_type,
    });

    // 2. Policy
    steps.push({
      title: "Seleccionar Póliza",
      content: (
        <StepPolicySelect
          form={form}
          onChange={onChange}
          policies={policies?.map((p) => ({ id: p.id, policy_number: p.policy_number, company: p.company })) || []}
          profile={profile}
          selectedPolicy={selectedPolicy ? { id: selectedPolicy.id, policy_number: selectedPolicy.policy_number, company: selectedPolicy.company } : undefined}
        />
      ),
      valid: !!form.policy_id,
    });

    // 3. Medical info
    steps.push({
      title: "Información Médica",
      content: <StepMedicalInfo form={form} onChange={onChange} />,
      valid: !!form.diagnosis && !!form.treatment && !!form.symptom_start_date,
    });

    // 4. Hospital (optional but always shown)
    steps.push({
      title: "Hospitalización",
      content: <StepHospitalInfo form={form} onChange={onChange} />,
      valid: true, // optional
    });

    if (isReembolso) {
      // 5. Invoices
      steps.push({
        title: "Facturas",
        content: <StepInvoices form={form} onChange={onChange} />,
        valid: !!form.total_cost || form.invoices.length > 0,
      });
      // 6. Payment
      steps.push({
        title: "Método de Pago",
        content: <StepPayment form={form} onChange={onChange} />,
        valid: !!form.payment_method && (form.payment_method !== "transferencia" || (!!form.bank_name && form.clabe.length === 18)),
      });
    } else {
      // 5. Surgery / Programación
      steps.push({
        title: "Programación",
        content: <StepSurgeryInfo form={form} onChange={onChange} />,
        valid: !!form.surgeon_name && !!form.surgery_hospital && !!form.surgery_date && !!form.procedure_description && !!form.total_cost,
      });
    }

    // Final: Review
    steps.push({
      title: "Revisión",
      content: (
        <StepReview
          form={form}
          profileName={profile?.full_name || ""}
          policyLabel={`${company} — ${selectedPolicy?.policy_number || ""}`}
          company={company}
        />
      ),
      valid: true,
    });

    return steps;
  };

  const steps = buildSteps();

  const createMutation = useMutation({
    mutationFn: async () => {
      const totalCost = isReembolso
        ? form.invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || parseFloat(form.total_cost)
        : parseFloat(form.total_cost);

      const formData = {
        prior_company: form.prior_company,
        has_prior_claims: form.has_prior_claims,
        accident_description: form.accident_description,
        hospital_name: form.hospital_name,
        hospital_address: form.hospital_address,
        admission_date: form.admission_date,
        discharge_date: form.discharge_date,
        hospitalization_days: form.hospitalization_days,
        lab_studies: form.lab_studies,
        payment_method: form.payment_method,
        bank_name: form.bank_name,
        clabe: form.clabe,
        invoices: form.invoices,
        surgeon_name: form.surgeon_name,
        surgeon_specialty: form.surgeon_specialty,
        surgeon_license: form.surgeon_license,
        surgery_hospital: form.surgery_hospital,
        surgery_date: form.surgery_date,
        procedure_description: form.procedure_description,
      };

      const { error } = await supabase.from("claims").insert({
        user_id: user!.id,
        policy_id: form.policy_id,
        claim_type: form.claim_type as ClaimType,
        incident_date: form.symptom_start_date || form.incident_date,
        diagnosis: form.diagnosis,
        treatment: form.treatment,
        total_cost: totalCost,
        notes: form.notes,
        cause: form.cause,
        symptom_start_date: form.symptom_start_date || null,
        first_attention_date: form.first_attention_date || null,
        is_initial_claim: form.is_initial_claim,
        prior_claim_number: form.prior_claim_number,
        form_data: formData as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reclamo creado exitosamente");
      navigate("/reclamos");
    },
    onError: () => toast.error("Error al crear reclamo"),
  });

  const handleDownloadPDF = () => {
    if (!profile || !selectedPolicy) return;
    const doc = generateClaimPDF(form, profile, {
      policy_number: selectedPolicy.policy_number,
      company: selectedPolicy.company,
    });
    const fileName = `${company.replace(/\s/g, "_")}_${isReembolso ? "Reembolso" : "Programacion"}_${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    toast.success("PDF descargado");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold">Nuevo Reclamo</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-4 ${i < step ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{steps[step].title}</CardTitle>
        </CardHeader>
        <CardContent>{steps[step].content}</CardContent>
      </Card>

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button className="flex-1" disabled={!steps[step].valid} onClick={() => setStep(step + 1)}>
            Siguiente <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <div className="flex-1 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownloadPDF}
              disabled={!selectedPolicy}
            >
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button
              className="flex-1"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

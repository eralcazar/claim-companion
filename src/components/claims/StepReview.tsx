import type { ClaimFormData } from "./types";

interface Props {
  form: ClaimFormData;
  profileName: string;
  policyLabel: string;
  company: string;
}

const causeLabels: Record<string, string> = {
  accidente: "Accidente",
  enfermedad: "Enfermedad",
  embarazo: "Embarazo",
};

export default function StepReview({ form, profileName, policyLabel, company }: Props) {
  const total = form.claim_type === "reembolso"
    ? form.invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || parseFloat(form.total_cost) || 0
    : parseFloat(form.total_cost) || 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Revisa los datos antes de enviar:</p>
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <p><strong>Aseguradora:</strong> {company}</p>
        <p><strong>Tipo:</strong> {form.claim_type === "reembolso" ? "Reembolso" : "Programación de Servicios"}</p>
        <p><strong>Reclamación:</strong> {form.is_initial_claim ? "Inicial" : `Complementaria — ${form.prior_claim_number}`}</p>
        <p><strong>Paciente:</strong> {profileName}</p>
        <p><strong>Póliza:</strong> {policyLabel}</p>
        <hr className="my-2" />
        <p><strong>Causa:</strong> {causeLabels[form.cause]}</p>
        <p><strong>Inicio de síntomas:</strong> {form.symptom_start_date || "—"}</p>
        <p><strong>Primera atención:</strong> {form.first_attention_date || "—"}</p>
        <p><strong>Diagnóstico:</strong> {form.diagnosis}</p>
        <p><strong>Tratamiento:</strong> {form.treatment}</p>

        {form.claim_type === "procedimiento_programado" && (
          <>
            <hr className="my-2" />
            <p><strong>Médico:</strong> {form.surgeon_name}</p>
            <p><strong>Hospital:</strong> {form.surgery_hospital}</p>
            <p><strong>Fecha programada:</strong> {form.surgery_date}</p>
            <p><strong>Procedimiento:</strong> {form.procedure_description}</p>
          </>
        )}

        {form.claim_type === "reembolso" && form.invoices.length > 0 && (
          <>
            <hr className="my-2" />
            <p className="font-medium">Facturas ({form.invoices.length}):</p>
            {form.invoices.map((inv, i) => (
              <p key={i} className="pl-3">• {inv.number} — {inv.provider} — ${parseFloat(inv.amount || "0").toLocaleString()}</p>
            ))}
            {form.payment_method && (
              <p><strong>Pago:</strong> {form.payment_method === "transferencia" ? `Transferencia — ${form.bank_name} — CLABE: ${form.clabe}` : "Cheque"}</p>
            )}
          </>
        )}

        <hr className="my-2" />
        <p className="text-base"><strong>Total:</strong> ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
        {form.notes && <p><strong>Notas:</strong> {form.notes}</p>}
      </div>
    </div>
  );
}

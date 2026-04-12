import jsPDF from "jspdf";
import type { ClaimFormData } from "./types";

interface ProfileData {
  full_name: string;
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  rfc?: string | null;
  curp?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  street_number?: string | null;
  interior_number?: string | null;
  neighborhood?: string | null;
  municipality?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface PolicyData {
  policy_number: string;
  company: string;
}

const causeLabels: Record<string, string> = {
  accidente: "Accidente",
  enfermedad: "Enfermedad",
  embarazo: "Embarazo",
};

function addField(doc: jsPDF, label: string, value: string, x: number, y: number, labelWidth = 50) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.text(value || "—", x + labelWidth, y);
}

function addSection(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(59, 130, 246);
  doc.rect(15, y - 4, 180, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 18, y);
  doc.setTextColor(0, 0, 0);
  return y + 8;
}

function formatDate(d: string): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function generateClaimPDF(
  form: ClaimFormData,
  profile: ProfileData,
  policy: PolicyData
): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const company = policy.company;
  const isMetLife = company.toLowerCase().includes("metlife");
  const isReembolso = form.claim_type === "reembolso";

  // Header
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const title = isMetLife
    ? "Solicitud de Reclamación Gastos Médicos Mayores"
    : isReembolso
    ? "Solicitud de Reembolso — Siniestros Accidentes y Enfermedades"
    : "Solicitud de Pago Directo y/o Programación de Servicios";
  doc.text(title, 105, 15, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(company.toUpperCase(), 105, 21, { align: "center" });

  doc.setFontSize(7);
  doc.text(`Fecha: ${formatDate(new Date().toISOString().split("T")[0])}`, 160, 28);
  doc.text(
    isReembolso
      ? `Tipo: ${form.is_initial_claim ? "Inicial" : "Complementaria"}`
      : `Tipo: Programación de servicios — ${form.is_initial_claim ? "Inicial" : "Complementaria"}`,
    15,
    28
  );
  if (!form.is_initial_claim && form.prior_claim_number) {
    doc.text(`No. Siniestro: ${form.prior_claim_number}`, 15, 32);
  }

  // Section 1: Patient data
  let y = addSection(doc, "1. Datos del Paciente", 38);

  addField(doc, "Nombre:", profile.full_name, 15, y);
  y += 5;
  addField(doc, "Ap. Paterno:", profile.paternal_surname, 15, y);
  addField(doc, "Ap. Materno:", profile.maternal_surname, 105, y);
  y += 5;
  addField(doc, "RFC:", profile.rfc || "", 15, y);
  addField(doc, "CURP:", profile.curp || "", 105, y);
  y += 5;
  addField(doc, "Fecha Nac.:", formatDate(profile.date_of_birth || ""), 15, y);
  addField(doc, "Sexo:", profile.sex === "M" ? "Masculino" : profile.sex === "F" ? "Femenino" : (profile.sex || ""), 105, y);
  y += 5;
  addField(doc, "Teléfono:", profile.phone || "", 15, y);
  addField(doc, "Email:", profile.email || "", 105, y);
  y += 5;
  const address = [profile.street, profile.street_number, profile.neighborhood, profile.municipality, profile.state, profile.postal_code]
    .filter(Boolean)
    .join(", ");
  addField(doc, "Domicilio:", address, 15, y, 20);
  y += 8;

  // Section 2: Policy
  y = addSection(doc, "2. Datos de la Póliza", y);
  addField(doc, "Aseguradora:", policy.company, 15, y);
  addField(doc, "No. Póliza:", policy.policy_number, 105, y);
  y += 8;

  // Section 3: Claim info
  y = addSection(doc, "3. Información de la Reclamación", y);
  addField(doc, "Causa:", causeLabels[form.cause], 15, y);
  addField(doc, "Tipo:", isReembolso ? "Reembolso" : "Programación de Servicios", 105, y);
  y += 5;
  addField(doc, "Inicio síntomas:", formatDate(form.symptom_start_date), 15, y);
  addField(doc, "Primera atención:", formatDate(form.first_attention_date), 105, y);
  y += 5;
  addField(doc, "Diagnóstico:", form.diagnosis, 15, y, 25);
  y += 5;

  // Treatment (may need word wrap)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Tratamiento:", 15, y);
  doc.setFont("helvetica", "normal");
  const treatmentLines = doc.splitTextToSize(form.treatment || "—", 140);
  doc.text(treatmentLines, 40, y);
  y += treatmentLines.length * 4 + 3;

  if (form.cause === "accidente" && form.accident_description) {
    doc.setFont("helvetica", "bold");
    doc.text("Detalle accidente:", 15, y);
    doc.setFont("helvetica", "normal");
    const accLines = doc.splitTextToSize(form.accident_description, 140);
    doc.text(accLines, 45, y);
    y += accLines.length * 4 + 3;
  }

  if (form.lab_studies) {
    doc.setFont("helvetica", "bold");
    doc.text("Estudios:", 15, y);
    doc.setFont("helvetica", "normal");
    const labLines = doc.splitTextToSize(form.lab_studies, 145);
    doc.text(labLines, 35, y);
    y += labLines.length * 4 + 3;
  }

  if (form.has_prior_claims) {
    addField(doc, "Gastos previos:", `Sí — ${form.prior_company}`, 15, y, 35);
    y += 5;
  }

  // Hospital info
  if (form.hospital_name) {
    y += 2;
    y = addSection(doc, "4. Datos de Hospitalización", y);
    addField(doc, "Hospital:", form.hospital_name, 15, y);
    y += 5;
    addField(doc, "Dirección:", form.hospital_address, 15, y, 22);
    y += 5;
    addField(doc, "Ingreso:", formatDate(form.admission_date), 15, y);
    addField(doc, "Egreso:", formatDate(form.discharge_date), 75, y);
    addField(doc, "Días:", form.hospitalization_days, 140, y, 15);
    y += 8;
  }

  // Surgery info (programación)
  if (form.claim_type === "procedimiento_programado") {
    y = addSection(doc, isMetLife ? "5. Programación de Cirugía" : "4. Programación de Servicios", y);
    addField(doc, "Médico:", form.surgeon_name, 15, y);
    addField(doc, "Cédula:", form.surgeon_license, 105, y);
    y += 5;
    addField(doc, "Especialidad:", form.surgeon_specialty, 15, y);
    y += 5;
    addField(doc, "Hospital:", form.surgery_hospital, 15, y);
    addField(doc, "Fecha:", formatDate(form.surgery_date), 105, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Procedimiento:", 15, y);
    doc.setFont("helvetica", "normal");
    const procLines = doc.splitTextToSize(form.procedure_description || "—", 140);
    doc.text(procLines, 40, y);
    y += procLines.length * 4 + 3;
    addField(doc, "Costo estimado:", `$${Number(form.total_cost || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 15, y, 30);
    y += 8;
  }

  // Invoices (reembolso)
  if (isReembolso && form.invoices.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 20;
    }
    y = addSection(doc, "5. Detalle de Facturas", y);

    // Table header
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("#", 15, y);
    doc.text("No. Factura", 22, y);
    doc.text("Proveedor", 55, y);
    doc.text("Concepto", 120, y);
    doc.text("Importe", 160, y);
    y += 1;
    doc.line(15, y, 195, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    form.invoices.forEach((inv, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${i + 1}`, 15, y);
      doc.text(inv.number, 22, y);
      doc.text(inv.provider.substring(0, 35), 55, y);
      doc.text(
        inv.concept === "hospital" ? "Hospital" : inv.concept === "honorarios" ? "Honorarios" : inv.concept === "farmacia" ? "Farmacia" : "Otros",
        120,
        y
      );
      doc.text(`$${parseFloat(inv.amount || "0").toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 160, y);
      y += 5;
    });

    const invoiceTotal = form.invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    doc.line(15, y, 195, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Total reclamado:", 120, y);
    doc.text(`$${(invoiceTotal || parseFloat(form.total_cost) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 160, y);
    y += 8;

    // Payment info
    if (form.payment_method) {
      y = addSection(doc, "6. Información de Pago", y);
      addField(doc, "Método:", form.payment_method === "transferencia" ? "Transferencia electrónica" : "Cheque", 15, y);
      y += 5;
      if (form.payment_method === "transferencia") {
        addField(doc, "Banco:", form.bank_name, 15, y);
        y += 5;
        addField(doc, "CLABE:", form.clabe, 15, y);
        y += 5;
      }
      y += 3;
    }
  }

  // Signature area
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  y += 10;
  doc.line(15, y, 85, y);
  doc.line(110, y, 195, y);
  y += 4;
  doc.setFontSize(7);
  doc.text("Nombre y firma del Asegurado titular", 15, y);
  doc.text("Lugar y fecha", 110, y);

  // Notes
  if (form.notes) {
    y += 10;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Notas:", 15, y);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(form.notes, 175);
    doc.text(noteLines, 15, y + 4);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text(`Generado por MediClaim — ${company} — Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
    doc.setTextColor(0);
  }

  return doc;
}

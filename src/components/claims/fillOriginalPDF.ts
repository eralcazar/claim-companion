import { PDFDocument } from "pdf-lib";
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

function fmtDate(d: string): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function calcAge(dob: string): string {
  if (!dob) return "";
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return String(age);
}

function getPdfUrl(company: string, claimType: string): string {
  const isMetLife = company.toLowerCase().includes("metlife");
  const isReembolso = claimType === "reembolso";
  if (isMetLife) {
    return isReembolso ? "/forms/METLIFE_REEMBOLSO.pdf" : "/forms/METLIFE_PROGRAMACION_DE_SERVICIOS.pdf";
  }
  return isReembolso ? "/forms/MAPFRE_REEMBOLSO.pdf" : "/forms/MAPFRE_PROGRAMACION_DE_SERVICIOS.pdf";
}

function setField(pdfForm: any, fieldId: string, value: string) {
  try {
    const field = pdfForm.getTextField(fieldId);
    field.setText(value || "");
  } catch { /* field not found, skip */ }
}

function checkBox(pdfForm: any, fieldId: string, checked: boolean, checkedValue = "/Yes") {
  try {
    const field = pdfForm.getCheckBox(fieldId);
    if (checked) field.check();
    else field.uncheck();
  } catch { /* skip */ }
}

function fillMetLifeFields(pdfForm: any, form: ClaimFormData, profile: ProfileData, policy: PolicyData) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const [ty, tm, td] = todayStr.split("-");

  // Date
  setField(pdfForm, "D1", td);
  setField(pdfForm, "M1", tm);
  setField(pdfForm, "A1", ty);

  // Policy type - individual
  checkBox(pdfForm, "INDI", true);

  // Titular data (section 1 = titular = patient for now)
  setField(pdfForm, "Apellido paterno", profile.paternal_surname);
  setField(pdfForm, "Apellido materno", profile.maternal_surname);
  setField(pdfForm, "Nombres", profile.first_name);
  setField(pdfForm, "Registro Federal de Contribuyentes RFC", profile.rfc || "");
  setField(pdfForm, "Póliza", policy.policy_number);

  // DOB
  if (profile.date_of_birth) {
    const [dy, dm, dd] = profile.date_of_birth.split("-");
    setField(pdfForm, "DIAASEG", dd);
    setField(pdfForm, "MESASEG", dm);
    setField(pdfForm, "AASEG", dy);
  }

  // Patient = same as titular
  setField(pdfForm, "Apellido paterno_2", profile.paternal_surname);
  setField(pdfForm, "Apellido materno_2", profile.maternal_surname);
  setField(pdfForm, "Nombres_2", profile.first_name);

  // Address
  setField(pdfForm, "Calle  Avenida", profile.street || "");
  setField(pdfForm, "Exterior", profile.street_number || "");
  setField(pdfForm, "Interior", profile.interior_number || "");
  setField(pdfForm, "Colonia  Barrio", profile.neighborhood || "");
  setField(pdfForm, "Código postal", profile.postal_code || "");
  setField(pdfForm, "Municipio  Alcaldía", profile.municipality || "");
  setField(pdfForm, "Estado  Provincia", profile.state || "");
  setField(pdfForm, "País", profile.country || "México");
  setField(pdfForm, "Celular", profile.phone || "");
  setField(pdfForm, "PRE", profile.email || "");

  // Page 2 - Claim info
  const isReembolso = form.claim_type === "reembolso";
  checkBox(pdfForm, "REMBOLSO", isReembolso);
  checkBox(pdfForm, "PROGRAMACION", !isReembolso);

  checkBox(pdfForm, "PRIMERA", form.is_initial_claim);
  checkBox(pdfForm, "SUBSECUENTE", !form.is_initial_claim);
  if (!form.is_initial_claim && form.prior_claim_number) {
    setField(pdfForm, "NUMSIN", form.prior_claim_number);
  }

  // Cause
  checkBox(pdfForm, "ACC", form.cause === "accidente");
  checkBox(pdfForm, "ENF", form.cause === "enfermedad");
  checkBox(pdfForm, "ENFo", form.cause === "embarazo");

  // Dates
  if (form.symptom_start_date) {
    const [sy, sm, sd] = form.symptom_start_date.split("-");
    setField(pdfForm, "DIAAA", sd);
    setField(pdfForm, "MEAA", sm);
    setField(pdfForm, "AAA1SIN", sy);
  }
  if (form.first_attention_date) {
    const [fy, fm, fd] = form.first_attention_date.split("-");
    setField(pdfForm, "DIA1SIN", fd);
    setField(pdfForm, "MES1SIN", fm);
    setField(pdfForm, "AS1SIN", fy);
  }

  // Diagnosis / treatment / studies
  setField(pdfForm, "S11", form.diagnosis);
  setField(pdfForm, "S21", form.treatment);
  setField(pdfForm, "S31", form.accident_description || "");

  // Hospital
  if (form.hospital_name) {
    checkBox(pdfForm, "SIAU", true);
    setField(pdfForm, "CUALAU", form.hospital_name);
    setField(pdfForm, "COM1", form.hospital_address || "");
  }

  // Lab studies
  if (form.lab_studies) {
    setField(pdfForm, "c Detalla estudios que presentas campo obligatorio", form.lab_studies);
  }

  // Prior claims with other companies
  if (form.has_prior_claims) {
    checkBox(pdfForm, "SIPGMM", true);
  } else {
    checkBox(pdfForm, "NOGMM", false);
  }

  // Invoices (reembolso)
  if (isReembolso) {
    form.invoices.slice(0, 6).forEach((inv, i) => {
      const row = i + 1;
      setField(pdfForm, `Número Factura  ReciboRow${row}`, inv.number);
      setField(pdfForm, `ConceptoRow${row}`, inv.concept === "hospital" ? "Hospital" : inv.concept === "honorarios" ? "Honorarios" : inv.concept === "farmacia" ? "Farmacia" : "Otros");
      setField(pdfForm, `ImporteRow${row}`, inv.amount);
    });

    const total = form.invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || parseFloat(form.total_cost) || 0;
    setField(pdfForm, "Total reclamado", total.toLocaleString("es-MX", { minimumFractionDigits: 2 }));

    // Payment
    if (form.payment_method === "transferencia") {
      checkBox(pdfForm, "transferencia", true);
      setField(pdfForm, "Nombre de la institución bancaria", form.bank_name || "");
      setField(pdfForm, "CLABE 1 Clave Bancaria Estandarizada", form.clabe || "");
    } else {
      checkBox(pdfForm, "cheque", true);
    }
  }

  // Notes
  if (form.notes) {
    setField(pdfForm, "COM2", form.notes);
  }
}

function fillMapfreReembolsoFields(pdfForm: any, form: ClaimFormData, profile: ProfileData, policy: PolicyData) {
  const today = fmtDate(new Date().toISOString().split("T")[0]);

  setField(pdfForm, "Fecha", today);

  // Initial / complementary
  checkBox(pdfForm, "Inicial", form.is_initial_claim);
  checkBox(pdfForm, "Complemento", !form.is_initial_claim);
  if (!form.is_initial_claim) setField(pdfForm, "Número de siniestro", form.prior_claim_number || "");

  // Patient
  setField(pdfForm, "Nombre del paciente", profile.full_name);
  setField(pdfForm, "RFC", profile.rfc || "");
  setField(pdfForm, "CURP_", profile.curp || "");
  checkBox(pdfForm, "Masculino", profile.sex === "M");
  checkBox(pdfForm, "Femenino", profile.sex === "F");
  setField(pdfForm, "Edad", calcAge(profile.date_of_birth || ""));

  // Policy
  setField(pdfForm, "Número de póliza", policy.policy_number);
  setField(pdfForm, "Nombre del titular", profile.full_name);

  // Cause
  checkBox(pdfForm, "Accidente", form.cause === "accidente");
  checkBox(pdfForm, "Enfermedad", form.cause === "enfermedad");
  checkBox(pdfForm, "Embarazo", form.cause === "embarazo");

  // Dates
  setField(pdfForm, "fecha primera vez", fmtDate(form.symptom_start_date));
  setField(pdfForm, "Fecha accidente", fmtDate(form.first_attention_date));
  setField(pdfForm, "fecha indemnizacion", fmtDate(form.first_attention_date));

  // Diagnosis
  setField(pdfForm, "Indique el diagnóstico motivo de su reclamación", form.diagnosis);
  if (form.cause === "accidente") {
    setField(pdfForm, "Si es accidente detalle cómo y dónde ocurrió", form.accident_description || "");
  }
  setField(pdfForm, "Qué estudios de laboratorio y gabinete le fueron realizados", form.lab_studies || "");

  // Prior claims
  if (form.has_prior_claims) {
    checkBox(pdfForm, "Sí", true);
    setField(pdfForm, "Compañía", form.prior_company || "");
  }

  // Hospital
  if (form.hospital_name) {
    checkBox(pdfForm, "Si_2", true);
    setField(pdfForm, "Nombre del hospital donde se atendió", form.hospital_name);
    setField(pdfForm, "Dirección", form.hospital_address || "");
    setField(pdfForm, "Fecha ingreso", fmtDate(form.admission_date));
    setField(pdfForm, "Fecha de egreso", fmtDate(form.discharge_date));
    setField(pdfForm, "Días hospitalización", form.hospitalization_days || "");
  }

  // Address
  setField(pdfForm, "Calle", `${profile.street || ""} ${profile.street_number || ""}`.trim());
  setField(pdfForm, "Colonia", profile.neighborhood || "");
  setField(pdfForm, "Delegación o municipio", profile.municipality || "");
  setField(pdfForm, "Código postal pago", profile.postal_code || "");
  setField(pdfForm, "Teléfonos", profile.phone || "");
  setField(pdfForm, "Celular", profile.phone || "");
  setField(pdfForm, "Correo electrónico", profile.email || "");
  setField(pdfForm, "Nacionalidad", "Mexicana");
  setField(pdfForm, "País nacimiento", profile.country || "México");
  setField(pdfForm, "RFC 2", profile.rfc || "");
  setField(pdfForm, "Ocupación", "");

  // Payment
  if (form.payment_method === "transferencia") {
    checkBox(pdfForm, "Transferencia electrónica", true);
    setField(pdfForm, "Banco", form.bank_name || "");
    setField(pdfForm, "Clabe interbancaria", form.clabe || "");
  } else {
    checkBox(pdfForm, "Cheque", true);
  }

  // Invoices (page 2)
  form.invoices.slice(0, 15).forEach((inv, i) => {
    const idx = i + 1;
    setField(pdfForm, `Nombre del proveedor${idx}`, inv.provider);
    setField(pdfForm, `Número de factura yo recibo${idx === 1 ? "" : ` ${idx}`}`, inv.number);
    setField(pdfForm, `fill_${18 + idx}`, inv.amount);
  });

  const total = form.invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || parseFloat(form.total_cost) || 0;
  setField(pdfForm, "fill_34", total.toLocaleString("es-MX", { minimumFractionDigits: 2 }));

  if (form.notes) setField(pdfForm, "Observaciones", form.notes);
}

function fillMapfreProgFields(pdfForm: any, form: ClaimFormData, profile: ProfileData, policy: PolicyData) {
  const today = fmtDate(new Date().toISOString().split("T")[0]);

  setField(pdfForm, "Fecha 1", today);
  checkBox(pdfForm, "Programación", true);

  if (!form.is_initial_claim) setField(pdfForm, "Número de siniestro", form.prior_claim_number || "");

  // Patient
  setField(pdfForm, "Nombre del paciente", profile.full_name);
  setField(pdfForm, "RFC", profile.rfc || "");
  checkBox(pdfForm, "M", profile.sex === "M");
  checkBox(pdfForm, "F", profile.sex === "F");
  setField(pdfForm, "Edad", calcAge(profile.date_of_birth || ""));
  setField(pdfForm, "Correo", profile.email || "");
  setField(pdfForm, "Fecha de nacimiento", fmtDate(profile.date_of_birth || ""));

  // Address
  setField(pdfForm, "Calle", `${profile.street || ""} ${profile.street_number || ""}`.trim());
  setField(pdfForm, "Colonia", profile.neighborhood || "");
  setField(pdfForm, "Delegación", profile.municipality || "");
  setField(pdfForm, "Estado", profile.state || "");
  setField(pdfForm, "Teléfono", profile.phone || "");
  setField(pdfForm, "Código postal", profile.postal_code || "");

  // Policy
  setField(pdfForm, "N° póliza", policy.policy_number);
  setField(pdfForm, "Nombre del titular  contratante", profile.full_name);

  // Cause
  checkBox(pdfForm, "A", form.cause === "accidente");
  checkBox(pdfForm, "En", form.cause === "enfermedad");
  checkBox(pdfForm, "E", form.cause === "embarazo");

  // Dates
  setField(pdfForm, "Fecha 2", fmtDate(form.symptom_start_date));
  setField(pdfForm, "Fecha 3", fmtDate(form.first_attention_date));

  // Prior claims
  if (form.has_prior_claims) {
    checkBox(pdfForm, "Sí-", true);
    setField(pdfForm, "Aseguradora", form.prior_company || "");
  } else {
    checkBox(pdfForm, "No-", true);
  }

  // Diagnosis
  setField(pdfForm, "Indique el diagnóstico motivo de su reclamación", form.diagnosis);
  if (form.cause === "accidente") {
    setField(pdfForm, "Si es accidente detalle cómo y dónde ocurrió", form.accident_description || "");
  }
  setField(pdfForm, "Qué estudios de laboratorio y gabinete le fueron realizados", form.lab_studies || "");

  // Hospital
  if (form.hospital_name) {
    checkBox(pdfForm, "Sí 2", true);
    setField(pdfForm, "En caso afirmativo indique el nombre del hospital donde se atendió", form.hospital_name);
    setField(pdfForm, "Domicilio del hospital", form.hospital_address || "");
    setField(pdfForm, "Fecha ingreso", fmtDate(form.admission_date));
    setField(pdfForm, "Fecha egreso", fmtDate(form.discharge_date));
    setField(pdfForm, "Días hospitalización", form.hospitalization_days || "");
  } else {
    checkBox(pdfForm, "No 2", true);
  }

  // Surgery info (page 2)
  setField(pdfForm, "Nombre médico", form.surgeon_name || "");
  setField(pdfForm, "N° cédula", form.surgeon_license || "");
  setField(pdfForm, "Especialidad", form.surgeon_specialty || "");
  setField(pdfForm, "Fecha programada", fmtDate(form.surgery_date));
  setField(pdfForm, "Hospital", form.surgery_hospital || "");
  setField(pdfForm, "Procedimiento quirúrgico o tratamiento médico a realizar", form.procedure_description || "");
  setField(pdfForm, "Costo estimado con IVA", `$${Number(form.total_cost || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
}

export async function fillOriginalPDF(
  form: ClaimFormData,
  profile: ProfileData,
  policy: PolicyData
): Promise<Uint8Array> {
  const url = getPdfUrl(policy.company, form.claim_type);
  const response = await fetch(url);
  const pdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pdfForm = pdfDoc.getForm();

  const isMetLife = policy.company.toLowerCase().includes("metlife");
  const isReembolso = form.claim_type === "reembolso";

  if (isMetLife) {
    fillMetLifeFields(pdfForm, form, profile, policy);
  } else if (isReembolso) {
    fillMapfreReembolsoFields(pdfForm, form, profile, policy);
  } else {
    fillMapfreProgFields(pdfForm, form, profile, policy);
  }

  // Flatten so fields are not editable
  pdfForm.flatten();

  return pdfDoc.save();
}

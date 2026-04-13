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
  birth_country?: string | null;
  birth_state?: string | null;
  nationality?: string | null;
  occupation?: string | null;
  certificate_number?: string | null;
  relationship_to_titular?: string | null;
}

interface PolicyData {
  policy_number: string;
  company: string;
  policy_type?: string | null;
  contractor_name?: string | null;
  titular_paternal_surname?: string | null;
  titular_maternal_surname?: string | null;
  titular_first_name?: string | null;
  titular_dob?: string | null;
  titular_birth_country?: string | null;
  titular_birth_state?: string | null;
  titular_nationality?: string | null;
  titular_occupation?: string | null;
  titular_rfc?: string | null;
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

  // Section 1: Date + policy type
  setField(pdfForm, "D1", td);
  setField(pdfForm, "M1", tm);
  setField(pdfForm, "A1", ty);
  const isColectiva = policy.policy_type?.toLowerCase() === "colectiva";
  checkBox(pdfForm, "COLECTIVA", isColectiva);
  checkBox(pdfForm, "INDI", !isColectiva);

  // Contractor name
  setField(pdfForm, "Nombre del Contratante o razón social", policy.contractor_name || "");

  // Lugar y fecha (header)
  const lugar = [profile.municipality, profile.state].filter(Boolean).join(", ");
  setField(pdfForm, "Para facilitar los trámites de esta solicitud por favor llénala con letra de molde y tinta negra Este documento no será válido con", lugar);

  // Section 2: Titular data (from policy record)
  setField(pdfForm, "Apellido paterno", policy.titular_paternal_surname || profile.paternal_surname);
  setField(pdfForm, "Apellido materno", policy.titular_maternal_surname || profile.maternal_surname);
  setField(pdfForm, "Nombres", policy.titular_first_name || profile.first_name);
  // RFC split: first 10 chars in main field, last 3 in "undefined" field
  const rfc = policy.titular_rfc || profile.rfc || "";
  setField(pdfForm, "Registro Federal de Contribuyentes RFC", rfc.substring(0, 10));
  setField(pdfForm, "undefined", rfc.substring(10, 13));
  setField(pdfForm, "Póliza", policy.policy_number);

  // Titular DOB
  const titularDob = policy.titular_dob || profile.date_of_birth;
  if (titularDob) {
    const [dy, dm, dd] = titularDob.split("-");
    setField(pdfForm, "DIAASEG", dd);
    setField(pdfForm, "MESASEG", dm);
    setField(pdfForm, "AASEG", dy);
  }

  // Titular extra fields
  setField(pdfForm, "PAISNAC1", policy.titular_birth_country || profile.birth_country || "");
  setField(pdfForm, "ESTADONAC1", policy.titular_birth_state || profile.birth_state || "");
  setField(pdfForm, "NAC1", policy.titular_nationality || profile.nationality || "");
  setField(pdfForm, "OCUP1", policy.titular_occupation || profile.occupation || "");

  // Section 3: Affected insured - always from profile
  setField(pdfForm, "Apellido paterno_2", profile.paternal_surname);
  setField(pdfForm, "Apellido materno_2", profile.maternal_surname);
  setField(pdfForm, "Nombres_2", profile.first_name);
  if (profile.date_of_birth) {
    const [py, pm, pd] = profile.date_of_birth.split("-");
    setField(pdfForm, "DIAPAC", pd);
    setField(pdfForm, "MESPEC", pm);
    setField(pdfForm, "APAC", py);
  }
  setField(pdfForm, "PAISNAC2", profile.birth_country || "");
  setField(pdfForm, "EDONAC2", profile.birth_state || "");
  setField(pdfForm, "OCUPAC2", profile.occupation || "");
  setField(pdfForm, "CERTIF", profile.certificate_number || "");
  setField(pdfForm, "PARENTESCO", profile.relationship_to_titular || "");

  // Section 4: Address
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

  // Section 5: Complementary data
  if (form.has_other_active_policy) {
    checkBox(pdfForm, "SIPGMM", true);
    setField(pdfForm, "CUALGMM", form.other_active_policy_name);
  } else {
    checkBox(pdfForm, "NOGMM", true);
  }

  if (form.had_prior_insurance) {
    checkBox(pdfForm, "SIANT", true);
    setField(pdfForm, "CIAANT", form.prior_insurance_company);
    setField(pdfForm, "FECHAANT", fmtDate(form.prior_insurance_start));
  } else {
    checkBox(pdfForm, "NOANT", true);
  }

  if (form.has_current_other_insurance) {
    checkBox(pdfForm, "SIACT", true);
    setField(pdfForm, "CIAACT", form.current_other_company);
    setField(pdfForm, "INICIOACT", fmtDate(form.current_other_start));
    setField(pdfForm, "FINACT", fmtDate(form.current_other_end));
  } else {
    checkBox(pdfForm, "NOACT", true);
  }

  if (form.has_prior_metlife_claims) {
    checkBox(pdfForm, "SIMET", true);
    setField(pdfForm, "NUMSINMET", form.prior_metlife_siniestro);
  } else {
    checkBox(pdfForm, "NOMET", true);
  }

  if (form.has_prior_claims) {
    checkBox(pdfForm, "SIOTRA", true);
    setField(pdfForm, "CIAOTRA", form.prior_company);
  } else {
    checkBox(pdfForm, "NOOTRA", true);
  }

  if (form.is_pep) {
    checkBox(pdfForm, "SIPEP", true);
  } else {
    checkBox(pdfForm, "NOPEP", true);
  }

  // Section 6: Claim info
  const isReembolso = form.claim_type === "reembolso";
  checkBox(pdfForm, "REMBOLSO", isReembolso);
  checkBox(pdfForm, "PROGRAMACION", !isReembolso);

  checkBox(pdfForm, "PRIMERA", form.is_initial_claim);
  checkBox(pdfForm, "SUBSECUENTE", !form.is_initial_claim);
  if (!form.is_initial_claim && form.prior_claim_number) {
    setField(pdfForm, "NUMSIN", form.prior_claim_number);
  }

  if (form.is_sending_prior_info) {
    checkBox(pdfForm, "SIENVIO", true);
    setField(pdfForm, "FOLIODCN", form.prior_dcn_folio);
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

  // Diagnosis / treatment / description
  setField(pdfForm, "S11", form.diagnosis);
  setField(pdfForm, "S21", form.treatment);
  setField(pdfForm, "S31", form.accident_description || "");

  // Authority knowledge (accident)
  if (form.cause === "accidente") {
    if (form.authority_knowledge) {
      checkBox(pdfForm, "SIAUT", true);
      setField(pdfForm, "CUALAUT", form.authority_name);
    } else {
      checkBox(pdfForm, "NOAUT", true);
    }
  }

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

  // Section 7: Invoices (reembolso)
  if (isReembolso) {
    form.invoices.slice(0, 6).forEach((inv, i) => {
      const row = i + 1;
      setField(pdfForm, `Número Factura  ReciboRow${row}`, inv.number);
      setField(pdfForm, `ConceptoRow${row}`, inv.concept === "hospital" ? "Hospital" : inv.concept === "honorarios" ? "Honorarios" : inv.concept === "farmacia" ? "Farmacia" : "Otros");
      setField(pdfForm, `ImporteRow${row}`, inv.amount);
    });

    const total = form.invoices.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || parseFloat(form.total_cost) || 0;
    setField(pdfForm, "Total reclamado", total.toLocaleString("es-MX", { minimumFractionDigits: 2 }));

    // Section 8-9: Payment
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

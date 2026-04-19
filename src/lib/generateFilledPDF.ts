import { supabase } from "@/integrations/supabase/client";
import { fillPDF } from "./pdfFiller";
import { formCoordinates, type FormCoordinatesKey } from "./formCoordinates";

const CHECK = "X";

export async function getPDFFromStorage(path: string): Promise<ArrayBuffer> {
  const { data } = supabase.storage.from("formatos").getPublicUrl(path);
  const response = await fetch(data.publicUrl);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el formato (${path}). ¿Está subido al bucket "formatos"?`);
  }
  return response.arrayBuffer();
}

export async function generateFilledPDF(
  formKey: FormCoordinatesKey,
  formData: Record<string, string>
): Promise<Uint8Array> {
  const config = formCoordinates[formKey];
  const pdfBytes = await getPDFFromStorage(config.storagePath);
  const allFields = [
    ...config.fields,
    ...(config.page1Fields || []),
    ...(config.page2Fields || []),
    ...(config.page3Fields || []),
  ];
  const fieldsWithValues = allFields.map((field) => ({
    ...field,
    value: formData[field.key] ?? "",
  }));
  return fillPDF(pdfBytes, fieldsWithValues);
}

export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Mapeo wizard → keys de coordenadas
// Traduce el shape de "data" del wizard + profile + policy
// a las keys planas que esperan las coordenadas.
// ============================================================

function pad2(n: number) { return String(n).padStart(2, "0"); }
function fmtNum(n: number | string | undefined | null) {
  const v = typeof n === "string" ? parseFloat(n) : (n || 0);
  if (!v || isNaN(v)) return "";
  return `$${v.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function calcAge(dob?: string): string {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 ? String(a) : "";
}

function explodeRFC(rfc: string) {
  // RFC persona física: AAAA######HHH (4 letras + 6 dígitos + 3 homoclave)
  const r = (rfc || "").toUpperCase().replace(/\s/g, "");
  return {
    rfc_l1: r[0] || "", rfc_l2: r[1] || "", rfc_l3: r[2] || "", rfc_l4: r[3] || "",
    rfc_a1: r[4] || "", rfc_a2: r[5] || "",
    rfc_m1: r[6] || "", rfc_m2: r[7] || "",
    rfc_d1: r[8] || "", rfc_d2: r[9] || "",
    rfc_h1: r[10] || "", rfc_h2: r[11] || "", rfc_h3: r[12] || "",
  };
}

function explodeDateDMY(d?: string, prefix = "fecha_nac") {
  if (!d) return {};
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return {};
  return {
    [`${prefix}_dia`]: pad2(dt.getDate()),
    [`${prefix}_mes`]: pad2(dt.getMonth() + 1),
    [`${prefix}_año`]: String(dt.getFullYear()),
  };
}

export interface OverlayContext {
  data: Record<string, any>;
  profile: any;
  policy: any;
  insurer: string;
  tramite: string;
}

export function buildOverlayData(ctx: OverlayContext): Record<string, string> {
  const { data, profile = {}, policy = {} } = ctx;
  const out: Record<string, string> = {};
  const set = (k: string, v: any) => { out[k] = v == null ? "" : String(v); };

  // Identificación común
  set("numero_poliza", data.policy_number || policy.policy_number);
  set("numero_certificado", data.numero_certificado || policy.numero_certificado);
  set("nombre_contratante", policy.contractor_name || profile.full_name);
  set("apellido_paterno", data.paternal_surname || profile.paternal_surname);
  set("apellido_materno", data.maternal_surname || profile.maternal_surname);
  set("nombres", data.first_name || profile.first_name);
  set("nacionalidad", data.nationality || profile.nationality);
  set("ocupacion", data.occupation || profile.occupation);
  set("giro_negocio", data.giro_negocio || profile.giro_negocio);
  set("definir_cargo", data.cargo_pep || profile.cargo_pep);
  set("correo", data.email || profile.email);
  set("correo2", data.email || profile.email);
  set("codigo_cliente", profile.certificate_number);

  // Domicilio
  set("calle", profile.street);
  set("num_exterior", profile.street_number);
  set("num_interior", profile.interior_number);
  set("colonia", profile.neighborhood);
  set("cp", profile.postal_code);
  set("dom_calle", profile.street);
  set("dom_num_ext", profile.street_number);
  set("dom_num_int", profile.interior_number);
  set("dom_colonia", profile.neighborhood);
  set("dom_cp", profile.postal_code);
  set("dom_municipio", profile.municipality);

  // Sexo / estado civil / PEP
  const sex = (data.sex || profile.sex || "").toString().toLowerCase();
  set("check_masculino", sex.startsWith("m") ? CHECK : "");
  set("check_femenino", sex.startsWith("f") ? CHECK : "");
  set("check_sexo_m", sex.startsWith("m") ? CHECK : "");
  set("check_sexo_f", sex.startsWith("f") ? CHECK : "");

  const ec = (data.estado_civil || profile.estado_civil || "").toString().toLowerCase();
  set("check_soltero", ec === "soltero" ? CHECK : "");
  set("check_casado", ec === "casado" ? CHECK : "");
  set("check_divorciado", ec === "divorciado" ? CHECK : "");
  set("check_viudo", ec === "viudo" ? CHECK : "");
  set("check_concubinato", ec === "concubinato" ? CHECK : "");

  const pep = data.es_pep ?? profile.es_pep;
  set("check_pep_si", pep === true || pep === "true" || pep === "si" ? CHECK : "");
  set("check_pep_no", pep === false || pep === "false" || pep === "no" ? CHECK : "");

  // RFC, CURP
  Object.assign(out, explodeRFC(data.rfc || profile.rfc || ""));
  set("curp", (data.curp || profile.curp || "").toUpperCase());

  // Fechas
  const today = new Date();
  set("fecha_dia", pad2(today.getDate()));
  set("fecha_mes", pad2(today.getMonth() + 1));
  set("fecha_año", String(today.getFullYear()));
  Object.assign(out, explodeDateDMY(data.date_of_birth || profile.date_of_birth, "fecha_nac"));

  // Edad
  set("edad", calcAge(data.date_of_birth || profile.date_of_birth));

  // Causa (informe médico)
  const causa = (data.cause || data.causa || "").toString().toLowerCase();
  set("check_causa_accidente", causa.includes("accidente") ? CHECK : "");
  set("check_causa_enfermedad", causa.includes("enfermedad") ? CHECK : "");
  set("check_causa_embarazo", causa.includes("embarazo") || causa.includes("maternidad") ? CHECK : "");

  // Tipo de trámite (form A)
  const tt = (data.tipo_tramite || ctx.tramite || "").toString().toLowerCase();
  set("check_reembolso", tt.includes("reembolso") ? CHECK : "");
  set("check_prog_cirugia", tt.includes("cirugia") ? CHECK : "");
  set("check_prog_medicamentos", tt.includes("medicamento") ? CHECK : "");
  set("check_prog_servicios", tt.includes("servicio") ? CHECK : "");
  set("check_indemnizacion", tt.includes("indemnizacion") ? CHECK : "");
  set("check_reporte_hosp", tt.includes("reporte") || tt.includes("hospital") ? CHECK : "");

  // Historia clínica / clínicos
  set("historia_clinica", data.historia_clinica);
  set("pulso", data.pulso);
  set("respiracion", data.respiracion);
  set("temperatura", data.temperatura);
  set("presion_arterial", data.presion_arterial);
  set("peso", data.peso);
  set("altura", data.altura);
  set("exploracion_fisica", data.exploracion_fisica);
  set("estudios_realizados", data.estudios_realizados);
  set("tratamiento", data.tratamiento || data.treatment);
  set("fecha_inicio_trat", data.fecha_inicio_trat);
  set("fecha_inicio_complic", data.fecha_complicaciones);
  const compl = (data.complicaciones || "").toString().toLowerCase();
  set("check_complicaciones_si", compl === "si" ? CHECK : "");
  set("check_complicaciones_no", compl === "no" ? CHECK : "");
  set("diagnostico", data.diagnosis || data.diagnostico);

  // Médico tratante (interconsultantes[0]) y dinámicos
  const docs: any[] = data.interconsultantes || data.doctors || [];
  // Médico principal del form A
  set("med1_apellido_pat", data.med_paterno);
  set("med1_apellido_mat", data.med_materno);
  set("med1_nombres", data.med_nombre);
  set("med1_especialidad", data.med_especialidad);
  set("med1_cedula_prof", data.med_cedula);
  set("med1_cedula_esp", data.med_cedula_esp);
  set("med1_honorarios", fmtNum(data.med_honorarios));
  // BBVA usa formato "med1_*" reducido
  set("med1_nombre", [data.med_paterno, data.med_materno, data.med_nombre].filter(Boolean).join(" "));
  set("med1_cedula", data.med_cedula);

  docs.slice(0, 3).forEach((d, i) => {
    const idx = i + 2; // med2_, med3_, med4_
    set(`med${idx}_tipo`, d.participation);
    set(`med${idx}_apellido_pat`, d.paternal);
    set(`med${idx}_apellido_mat`, d.maternal);
    set(`med${idx}_nombres`, d.first_name);
    set(`med${idx}_especialidad`, d.specialty);
    set(`med${idx}_cedula_prof`, d.license);
    set(`med${idx}_cedula_esp`, d.specialty_license);
    set(`med${idx}_honorarios`, fmtNum(d.fees));
  });

  // Tabla de gastos (form C)
  const gastos: any[] = data.gastos || [];
  let totalGastos = 0;
  gastos.slice(0, 10).forEach((g, i) => {
    const idx = i + 1;
    set(`gasto${idx}_proveedor`, g.provider);
    set(`gasto${idx}_servicio`, g.service_type);
    const amount = parseFloat(g.amount) || 0;
    totalGastos += amount;
    set(`gasto${idx}_monto`, fmtNum(amount));
  });
  set("total_gastos", fmtNum(totalGastos));
  set("total_reclamado", fmtNum(totalGastos || data.total_cost));

  // Tipo solicitud / facturas (form C)
  const fact: string[] = Array.isArray(data.facturas) ? data.facturas : [];
  set("check_hospital", fact.includes("hospital") ? CHECK : "");
  set("check_honorarios", fact.includes("honorarios") ? CHECK : "");
  set("check_medicamentos", fact.includes("medicamentos") || fact.includes("farmacia") ? CHECK : "");
  set("check_patologia", fact.includes("patologia") || fact.includes("laboratorio") ? CHECK : "");
  set("check_otros", fact.includes("otro") || fact.includes("otros") ? CHECK : "");
  set("otros_especifique", data.facturas_otro_desc);

  set("check_reembolso_gm", tt.includes("reembolso") ? CHECK : "");
  set("check_carta_valoracion", data.tipo_solicitud === "carta_valoracion" ? CHECK : "");
  set("check_pago_indem", tt.includes("indemnizacion") ? CHECK : "");
  set("check_ap_estudiante", data.tipo_solicitud === "ap_estudiante" ? CHECK : "");
  set("check_maternidad", causa.includes("maternidad") || causa.includes("embarazo") ? CHECK : "");
  set("check_gasto_menor", data.tipo_solicitud === "gasto_menor" ? CHECK : "");

  const tipoRecl = (data.tipo_reclamacion || "").toString().toLowerCase();
  set("check_inicial", tipoRecl === "inicial" || data.is_initial_claim === true ? CHECK : "");
  set("check_complementaria", tipoRecl === "complementaria" || data.is_initial_claim === false ? CHECK : "");
  set("numero_siniestro", data.siniestro_num || data.prior_claim_number);
  set("desc_accidente", data.desc_accidente || data.accidente_descripcion);

  // Beneficiario
  const ben = (data.ben_tipo || "").toString().toLowerCase();
  set("check_ben_asegurado", ben === "asegurado" ? CHECK : "");
  set("check_ben_contratante", ben === "contratante" ? CHECK : "");
  set("check_ben_padre", ben === "padre" || ben === "padre_madre" ? CHECK : "");
  set("check_ben_otro", ben === "otro" ? CHECK : "");
  set("nombre_beneficiario", data.ben_nombre);
  set("ben_justificacion", data.ben_justificacion);

  // Banco / pago
  set("clabe", data.clabe);
  set("banco", data.bank || data.banco);
  set("titular_cuenta", data.account_owner || data.titular_cuenta);

  // Banorte: informe del reclamante
  set("nombre_reclamante", data.reclamante_nombre);
  set("parentesco", data.parentesco);
  set("telefono", data.telefono || profile.telefono_celular || profile.phone);
  set("desc_siniestro", data.descripcion_siniestro);

  // Agente (página agente GNP)
  set("agente_nombre", policy.agente_nombre);
  set("agente_clave", policy.agente_clave);
  set("agente_telefono", policy.agente_telefono);
  set("agente_estado", policy.agente_estado);

  // Lugar y fecha de firma
  set("lugar_fecha", `${profile.city || profile.municipality || "México"}, ${today.toLocaleDateString("es-MX")}`);

  // Tipo médico tratante (form A)
  const tipoMed = (data.med_tipo || "").toString().toLowerCase();
  set("check_tipo_tratante", tipoMed.includes("tratante") ? CHECK : "");
  set("check_tipo_cirujano", tipoMed.includes("cirujano") ? CHECK : "");

  return out;
}

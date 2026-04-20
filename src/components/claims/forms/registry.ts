import type { FormDefinition } from "./types";
import { formA } from "./definitions/formA-informe-medico";
import { formB } from "./definitions/formB-aviso-accidente";
import { formC } from "./definitions/formC-solicitud-reembolso";
import { formD } from "./definitions/formD-programacion";
import { formE } from "./definitions/formE-consentimiento";
import { formF } from "./definitions/formF-identificacion-allianz";
import { formG } from "./definitions/formG-carta-marsh";
import { formH } from "./definitions/formH-informe-reclamante";
import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de FORMATOS REALES por aseguradora.
// Cada entrada corresponde 1:1 a un PDF en Storage: formatos/<INSURER>/<file>.
// El `id` se usa como tramite_type en BD y para construir la formKey
// (p.ej. "METLIFE" + "reembolso" → "METLIFE_reembolso").
// ─────────────────────────────────────────────────────────────────────────────
export interface InsurerFormat {
  id: string;
  label: string;
  file: string;
}

const insurerFormats: Record<string, InsurerFormat[]> = {
  ALLIANZ: [
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
    { id: "aviso_accidente",        label: "Aviso de Accidente",      file: "aviso_accidente.pdf" },
    { id: "carta_remesa",           label: "Carta Remesa",            file: "carta_remesa.pdf" },
    { id: "identificacion_cliente", label: "Identificación Cliente",  file: "identificacion_cliente.pdf" },
  ],
  AXA: [
    { id: "reembolso",              label: "Reembolso",               file: "reembolso.pdf" },
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
    { id: "programacion_servicios", label: "Programación de Servicios", file: "programacion_servicios.pdf" },
  ],
  BANORTE: [
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
    { id: "informe_reclamante",     label: "Informe del Reclamante",  file: "informe_reclamante.PDF" },
  ],
  BBVA: [
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
  ],
  GNP: [
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
    { id: "aviso_accidente",        label: "Aviso de Accidente",      file: "aviso_accidente.pdf" },
  ],
  INBURSA: [
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
    { id: "aviso_accidente",        label: "Aviso de Accidente",      file: "aviso_accidente.pdf" },
  ],
  MAPFRE: [
    { id: "reembolso",              label: "Reembolso",               file: "reembolso.pdf" },
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
  ],
  METLIFE: [
    { id: "reembolso",              label: "Reembolso",               file: "reembolso.pdf" },
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
    { id: "programacion_servicios", label: "Programación de Servicios", file: "programacion_servicios.pdf" },
    { id: "consentimiento_informado", label: "Consentimiento Informado", file: "consentimiento_informado.pdf" },
  ],
  "PLAN SEGURO": [
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
  ],
  "SEGUROS MONTERREY": [
    { id: "informe_medico",         label: "Informe Médico",          file: "informe_medico.pdf" },
    { id: "aviso_accidente",        label: "Aviso de Accidente",      file: "aviso_accidente.pdf" },
  ],
};

// Mapeo (aseguradora, formatId) → código de definición de formulario A..H.
// Define los campos a llenar en el wizard.
const definitionMatrix: Record<string, Record<string, string>> = {
  ALLIANZ: {
    informe_medico: "A",
    aviso_accidente: "B",
    carta_remesa: "G",
    identificacion_cliente: "F",
  },
  AXA: {
    reembolso: "C",
    informe_medico: "A",
    programacion_servicios: "D",
  },
  BANORTE: {
    informe_medico: "A",
    informe_reclamante: "H",
  },
  BBVA: {
    informe_medico: "A",
  },
  GNP: {
    informe_medico: "A",
    aviso_accidente: "B",
  },
  INBURSA: {
    informe_medico: "A",
    aviso_accidente: "B",
  },
  MAPFRE: {
    reembolso: "C",
    informe_medico: "A",
  },
  METLIFE: {
    reembolso: "C",
    informe_medico: "A",
    programacion_servicios: "D",
    consentimiento_informado: "E",
  },
  "PLAN SEGURO": {
    informe_medico: "A",
  },
  "SEGUROS MONTERREY": {
    informe_medico: "A",
    aviso_accidente: "B",
  },
};

const definitions: Record<string, FormDefinition> = {
  A: formA,
  B: formB,
  C: formC,
  D: formD,
  E: formE,
  F: formF,
  G: formG,
  H: formH,
};

function normalizeInsurer(insurer: string): string {
  return (insurer || "").toUpperCase();
}

/**
 * Devuelve los formatos PDF reales que existen en Storage para esta aseguradora.
 * Cada uno corresponde a un archivo en formatos/<INSURER>/.
 */
export function getAvailableFormats(insurer: string): InsurerFormat[] {
  return insurerFormats[normalizeInsurer(insurer)] || [];
}

/**
 * Devuelve la key de coordenadas (p.ej. "METLIFE_reembolso") para llenar el PDF.
 * Construida como `${INSURER_NORMALIZED}_${formatId}`, donde el insurer normaliza
 * espacios por "_" (ej. "PLAN SEGURO" → "PLAN_SEGURO").
 */
export function getFormKey(insurer: string, formatId: string): string | null {
  const ins = normalizeInsurer(insurer);
  const formats = insurerFormats[ins];
  if (!formats || !formats.find((f) => f.id === formatId)) return null;
  return `${ins.replace(/\s+/g, "_")}_${formatId}`;
}

/**
 * Devuelve la definición del formulario (campos a capturar en el wizard)
 * para una combinación (aseguradora, formato).
 */
export function getFormDefinition(insurer: string, formatId: string): FormDefinition | null {
  const ins = normalizeInsurer(insurer);
  const code = definitionMatrix[ins]?.[formatId];
  if (!code) return null;
  return definitions[code] || null;
}

export function getAllDefinitions(): FormDefinition[] {
  return Object.values(definitions);
}

/**
 * Devuelve la URL pública de un formato en Storage (`formatos/<INSURER>/<file>`).
 */
export function getFormatPublicUrl(insurer: string, formatId: string): string | null {
  const ins = normalizeInsurer(insurer);
  const fmt = (insurerFormats[ins] || []).find((f) => f.id === formatId);
  if (!fmt) return null;
  const path = `${ins}/${fmt.file}`;
  const { data } = supabase.storage.from("formatos").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Verifica con un HEAD que el PDF original exista en Storage.
 * Devuelve true si responde 200, false en cualquier otro caso.
 */
export async function checkFormatExists(insurer: string, formatId: string): Promise<boolean> {
  const url = getFormatPublicUrl(insurer, formatId);
  if (!url) return false;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Lista plana de todos los formatos del catálogo (insurer × formato).
 */
export function listAllFormats(): Array<{ insurer: string; format: InsurerFormat }> {
  const out: Array<{ insurer: string; format: InsurerFormat }> = [];
  for (const [insurer, formats] of Object.entries(insurerFormats)) {
    for (const format of formats) out.push({ insurer, format });
  }
  return out;
}

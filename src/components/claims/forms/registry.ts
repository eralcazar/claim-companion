import type { FormDefinition } from "./types";
import { formA } from "./definitions/formA-informe-medico";
import { formB } from "./definitions/formB-aviso-accidente";
import { formC } from "./definitions/formC-solicitud-reembolso";
import { formD } from "./definitions/formD-programacion";
import { formE } from "./definitions/formE-consentimiento";
import { formF } from "./definitions/formF-identificacion-allianz";
import { formG } from "./definitions/formG-carta-marsh";
import { formH } from "./definitions/formH-informe-reclamante";
import type { TramiteType } from "@/lib/constants";

// Mapa de aseguradora → trámite → código de formulario.
// Para cada (aseguradora, tramite) seleccionado por el usuario,
// devolvemos el código de formulario que aplica.
const matrix: Record<string, Record<TramiteType, string>> = {
  ALLIANZ: {
    reembolso: "C", // ALLIANZ no tiene C oficialmente, pero ofrecemos A+B+F+G
    prog_cirugia: "A",
    prog_medicamentos: "A",
    prog_servicios: "A",
    indemnizacion: "B",
    reporte_hospitalario: "A",
  },
  AXA: {
    reembolso: "C",
    prog_cirugia: "D",
    prog_medicamentos: "D",
    prog_servicios: "D",
    indemnizacion: "A",
    reporte_hospitalario: "A",
  },
  BANORTE: {
    reembolso: "H",
    prog_cirugia: "A",
    prog_medicamentos: "A",
    prog_servicios: "A",
    indemnizacion: "A",
    reporte_hospitalario: "A",
  },
  BBVA: {
    reembolso: "A",
    prog_cirugia: "A",
    prog_medicamentos: "A",
    prog_servicios: "A",
    indemnizacion: "A",
    reporte_hospitalario: "A",
  },
  GNP: {
    reembolso: "A",
    prog_cirugia: "A",
    prog_medicamentos: "A",
    prog_servicios: "A",
    indemnizacion: "B",
    reporte_hospitalario: "A",
  },
  INBURSA: {
    reembolso: "A",
    prog_cirugia: "A",
    prog_medicamentos: "A",
    prog_servicios: "A",
    indemnizacion: "B",
    reporte_hospitalario: "A",
  },
  MAPFRE: {
    reembolso: "C",
    prog_cirugia: "D",
    prog_medicamentos: "D",
    prog_servicios: "D",
    indemnizacion: "A",
    reporte_hospitalario: "A",
  },
  METLIFE: {
    reembolso: "C",
    prog_cirugia: "D",
    prog_medicamentos: "D",
    prog_servicios: "D",
    indemnizacion: "A",
    reporte_hospitalario: "A",
  },
  "PLAN SEGURO": {
    reembolso: "A",
    prog_cirugia: "A",
    prog_medicamentos: "A",
    prog_servicios: "A",
    indemnizacion: "A",
    reporte_hospitalario: "A",
  },
  "SEGUROS MONTERREY": {
    reembolso: "A",
    prog_cirugia: "A",
    prog_medicamentos: "A",
    prog_servicios: "A",
    indemnizacion: "B",
    reporte_hospitalario: "A",
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

export function getFormDefinition(insurer: string, tramite: TramiteType): FormDefinition | null {
  const ins = (insurer || "").toUpperCase();
  const code = matrix[ins]?.[tramite];
  if (!code) return null;
  return definitions[code] || null;
}

export function getAllDefinitions(): FormDefinition[] {
  return Object.values(definitions);
}

// Mapa (insurer, tramite) → key del PDF original en bucket "formatos".
// Devuelve null si no hay PDF original mapeado (se usará fallback jsPDF).
const formKeyMatrix: Record<string, Partial<Record<TramiteType, string>>> = {
  GNP: {
    indemnizacion: "GNP_aviso_accidente",
    reembolso: "GNP_informe_medico",
    prog_cirugia: "GNP_informe_medico",
    prog_medicamentos: "GNP_informe_medico",
    prog_servicios: "GNP_informe_medico",
    reporte_hospitalario: "GNP_informe_medico",
  },
  AXA: {
    reembolso: "AXA_reembolso",
  },
  METLIFE: {
    reembolso: "METLIFE_reembolso",
  },
  BANORTE: {
    reembolso: "BANORTE_informe_reclamante",
  },
  BBVA: {
    reembolso: "BBVA_informe_medico",
    prog_cirugia: "BBVA_informe_medico",
    prog_medicamentos: "BBVA_informe_medico",
    prog_servicios: "BBVA_informe_medico",
    indemnizacion: "BBVA_informe_medico",
    reporte_hospitalario: "BBVA_informe_medico",
  },
  MAPFRE: {
    reembolso: "MAPFRE_reembolso",
  },
  ALLIANZ: {
    reembolso: "ALLIANZ_informe_medico",
    prog_cirugia: "ALLIANZ_informe_medico",
    prog_medicamentos: "ALLIANZ_informe_medico",
    prog_servicios: "ALLIANZ_informe_medico",
    indemnizacion: "ALLIANZ_informe_medico",
    reporte_hospitalario: "ALLIANZ_informe_medico",
  },
  INBURSA: {
    reembolso: "INBURSA_informe_medico",
    prog_cirugia: "INBURSA_informe_medico",
    prog_medicamentos: "INBURSA_informe_medico",
    prog_servicios: "INBURSA_informe_medico",
    indemnizacion: "INBURSA_informe_medico",
    reporte_hospitalario: "INBURSA_informe_medico",
  },
  "PLAN SEGURO": {
    reembolso: "PLAN SEGURO_informe_medico",
    prog_cirugia: "PLAN SEGURO_informe_medico",
    prog_medicamentos: "PLAN SEGURO_informe_medico",
    prog_servicios: "PLAN SEGURO_informe_medico",
    indemnizacion: "PLAN SEGURO_informe_medico",
    reporte_hospitalario: "PLAN SEGURO_informe_medico",
  },
  "SEGUROS MONTERREY": {
    reembolso: "SEGUROS MONTERREY_informe_medico",
    prog_cirugia: "SEGUROS MONTERREY_informe_medico",
    prog_medicamentos: "SEGUROS MONTERREY_informe_medico",
    prog_servicios: "SEGUROS MONTERREY_informe_medico",
    indemnizacion: "SEGUROS MONTERREY_informe_medico",
    reporte_hospitalario: "SEGUROS MONTERREY_informe_medico",
  },
};

export function getFormKey(insurer: string, tramite: TramiteType): string | null {
  const ins = (insurer || "").toUpperCase();
  return formKeyMatrix[ins]?.[tramite] || null;
}

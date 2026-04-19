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
    indemnizacion: "gnp_aviso_accidente",
    reembolso: "gnp_informe_medico",
    prog_cirugia: "gnp_informe_medico",
    prog_medicamentos: "gnp_informe_medico",
    prog_servicios: "gnp_informe_medico",
    reporte_hospitalario: "gnp_informe_medico",
  },
  AXA: {
    reembolso: "axa_reembolso",
  },
  METLIFE: {
    reembolso: "metlife_reembolso",
  },
  BANORTE: {
    reembolso: "banorte_informe_reclamante",
  },
  BBVA: {
    reembolso: "bbva_informe_medico",
    prog_cirugia: "bbva_informe_medico",
    prog_medicamentos: "bbva_informe_medico",
    prog_servicios: "bbva_informe_medico",
    indemnizacion: "bbva_informe_medico",
    reporte_hospitalario: "bbva_informe_medico",
  },
  MAPFRE: {
    reembolso: "mapfre_reembolso",
  },
  ALLIANZ: {
    reembolso: "allianz_informe_medico",
    prog_cirugia: "allianz_informe_medico",
    prog_medicamentos: "allianz_informe_medico",
    prog_servicios: "allianz_informe_medico",
    indemnizacion: "allianz_informe_medico",
    reporte_hospitalario: "allianz_informe_medico",
  },
  INBURSA: {
    reembolso: "inbursa_informe_medico",
    prog_cirugia: "inbursa_informe_medico",
    prog_medicamentos: "inbursa_informe_medico",
    prog_servicios: "inbursa_informe_medico",
    indemnizacion: "inbursa_informe_medico",
    reporte_hospitalario: "inbursa_informe_medico",
  },
  "PLAN SEGURO": {
    reembolso: "plan_seguro_informe_medico",
    prog_cirugia: "plan_seguro_informe_medico",
    prog_medicamentos: "plan_seguro_informe_medico",
    prog_servicios: "plan_seguro_informe_medico",
    indemnizacion: "plan_seguro_informe_medico",
    reporte_hospitalario: "plan_seguro_informe_medico",
  },
  "SEGUROS MONTERREY": {
    reembolso: "seguros_monterrey_informe_medico",
    prog_cirugia: "seguros_monterrey_informe_medico",
    prog_medicamentos: "seguros_monterrey_informe_medico",
    prog_servicios: "seguros_monterrey_informe_medico",
    indemnizacion: "seguros_monterrey_informe_medico",
    reporte_hospitalario: "seguros_monterrey_informe_medico",
  },
};

export function getFormKey(insurer: string, tramite: TramiteType): string | null {
  const ins = (insurer || "").toUpperCase();
  return formKeyMatrix[ins]?.[tramite] || null;
}

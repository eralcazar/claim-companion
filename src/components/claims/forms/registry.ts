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
// Cada key debe existir en src/lib/formCoordinates.ts y su archivo en Storage.
// Estructura real de carpetas verificada en bucket "formatos":
//   ALLIANZ/: aviso_accidente, carta_remesa, identificacion_cliente, informe_medico
//   AXA/: informe_medico, programacion_servicios, reembolso
//   BANORTE/: informe_medico, informe_reclamante.PDF
//   BBVA/: informe_medico
//   GNP/: aviso_accidente, informe_medico
//   INBURSA/: aviso_accidente, informe_medico
//   MAPFRE/: informe_medico, reembolso
//   METLIFE/: consentimiento_informado, informe_medico, programacion_servicios, reembolso
//   PLAN_SEGURO/: informe_medico
//   SEGUROS_MONTERREY/: aviso_accidente, informe_medico
const formKeyMatrix: Record<string, Partial<Record<TramiteType, string>>> = {
  ALLIANZ: {
    reembolso: "ALLIANZ_informe_medico",
    prog_cirugia: "ALLIANZ_informe_medico",
    prog_medicamentos: "ALLIANZ_informe_medico",
    prog_servicios: "ALLIANZ_informe_medico",
    reporte_hospitalario: "ALLIANZ_informe_medico",
    indemnizacion: "ALLIANZ_aviso_accidente",
  },
  AXA: {
    reembolso: "AXA_reembolso",
    prog_cirugia: "AXA_programacion_servicios",
    prog_medicamentos: "AXA_programacion_servicios",
    prog_servicios: "AXA_programacion_servicios",
    indemnizacion: "AXA_informe_medico",
    reporte_hospitalario: "AXA_informe_medico",
  },
  BANORTE: {
    reembolso: "BANORTE_informe_reclamante",
    prog_cirugia: "BANORTE_informe_medico",
    prog_medicamentos: "BANORTE_informe_medico",
    prog_servicios: "BANORTE_informe_medico",
    indemnizacion: "BANORTE_informe_medico",
    reporte_hospitalario: "BANORTE_informe_medico",
  },
  BBVA: {
    reembolso: "BBVA_informe_medico",
    prog_cirugia: "BBVA_informe_medico",
    prog_medicamentos: "BBVA_informe_medico",
    prog_servicios: "BBVA_informe_medico",
    indemnizacion: "BBVA_informe_medico",
    reporte_hospitalario: "BBVA_informe_medico",
  },
  GNP: {
    reembolso: "GNP_informe_medico",
    prog_cirugia: "GNP_informe_medico",
    prog_medicamentos: "GNP_informe_medico",
    prog_servicios: "GNP_informe_medico",
    reporte_hospitalario: "GNP_informe_medico",
    indemnizacion: "GNP_aviso_accidente",
  },
  INBURSA: {
    reembolso: "INBURSA_informe_medico",
    prog_cirugia: "INBURSA_informe_medico",
    prog_medicamentos: "INBURSA_informe_medico",
    prog_servicios: "INBURSA_informe_medico",
    reporte_hospitalario: "INBURSA_informe_medico",
    indemnizacion: "INBURSA_aviso_accidente",
  },
  MAPFRE: {
    reembolso: "MAPFRE_reembolso",
    prog_cirugia: "MAPFRE_informe_medico",
    prog_medicamentos: "MAPFRE_informe_medico",
    prog_servicios: "MAPFRE_informe_medico",
    indemnizacion: "MAPFRE_informe_medico",
    reporte_hospitalario: "MAPFRE_informe_medico",
  },
  METLIFE: {
    reembolso: "METLIFE_reembolso",
    prog_cirugia: "METLIFE_programacion_servicios",
    prog_medicamentos: "METLIFE_programacion_servicios",
    prog_servicios: "METLIFE_programacion_servicios",
    indemnizacion: "METLIFE_informe_medico",
    reporte_hospitalario: "METLIFE_informe_medico",
  },
  "PLAN SEGURO": {
    reembolso: "PLAN_SEGURO_informe_medico",
    prog_cirugia: "PLAN_SEGURO_informe_medico",
    prog_medicamentos: "PLAN_SEGURO_informe_medico",
    prog_servicios: "PLAN_SEGURO_informe_medico",
    indemnizacion: "PLAN_SEGURO_informe_medico",
    reporte_hospitalario: "PLAN_SEGURO_informe_medico",
  },
  "SEGUROS MONTERREY": {
    reembolso: "SEGUROS_MONTERREY_informe_medico",
    prog_cirugia: "SEGUROS_MONTERREY_informe_medico",
    prog_medicamentos: "SEGUROS_MONTERREY_informe_medico",
    prog_servicios: "SEGUROS_MONTERREY_informe_medico",
    reporte_hospitalario: "SEGUROS_MONTERREY_informe_medico",
    indemnizacion: "SEGUROS_MONTERREY_aviso_accidente",
  },
};

export function getFormKey(insurer: string, tramite: TramiteType): string | null {
  const ins = (insurer || "").toUpperCase();
  return formKeyMatrix[ins]?.[tramite] || null;
}

// Devuelve los trámites disponibles para una aseguradora,
// según las entradas presentes en formKeyMatrix (es decir, los PDFs configurados).
export function getAvailableTramites(insurer: string): TramiteType[] {
  const ins = (insurer || "").toUpperCase();
  const entry = formKeyMatrix[ins];
  if (!entry) return [];
  return Object.keys(entry).filter((k) => !!entry[k as TramiteType]) as TramiteType[];
}

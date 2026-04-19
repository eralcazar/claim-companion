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

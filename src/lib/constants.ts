// Centralized constants reused across forms, profile and policies.

export const ESTADOS_MX = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
] as const;

// 10 aseguradoras fijas, en mayúsculas, en el orden exacto requerido.
export const ASEGURADORAS = [
  "ALLIANZ",
  "AXA",
  "BANORTE",
  "BBVA",
  "GNP",
  "IMSS",
  "INBURSA",
  "MAPFRE",
  "METLIFE",
  "PLAN SEGURO",
  "SEGUROS MONTERREY",
] as const;

export type Aseguradora = (typeof ASEGURADORAS)[number];

export const ESTADOS_CIVILES = [
  { value: "soltero", label: "Soltero" },
  { value: "casado", label: "Casado" },
  { value: "divorciado", label: "Divorciado" },
  { value: "viudo", label: "Viudo" },
  { value: "concubinato", label: "Concubinato" },
] as const;

export const TIPOS_IDENTIFICACION = [
  { value: "ine", label: "INE/IFE" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "cedula", label: "Cédula Profesional" },
  { value: "cartilla", label: "Cartilla Militar" },
  { value: "otro", label: "Otro" },
] as const;

export const TIPOS_CONTRATACION = [
  { value: "individual", label: "Individual" },
  { value: "colectiva", label: "Colectiva" },
  { value: "familiar", label: "Familiar" },
] as const;

// Tipos de trámite del wizard de reclamo
export const TRAMITE_TYPES = [
  { value: "reembolso", label: "Reembolso" },
  { value: "prog_cirugia", label: "Programación de cirugía" },
  { value: "prog_medicamentos", label: "Programación de medicamentos" },
  { value: "prog_servicios", label: "Programación de servicios" },
  { value: "indemnizacion", label: "Indemnización" },
  { value: "reporte_hospitalario", label: "Reporte hospitalario" },
] as const;

export type TramiteType = (typeof TRAMITE_TYPES)[number]["value"];

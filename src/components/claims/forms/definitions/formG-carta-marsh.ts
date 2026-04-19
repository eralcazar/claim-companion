import type { FormDefinition } from "../types";

export const formG: FormDefinition = {
  code: "G",
  name: "Carta Remesa Marsh",
  insurers: ["ALLIANZ"],
  autofill: {
    agente_nombre: "policy.agente_nombre",
    agente_clave: "policy.agente_clave",
    asegurado_nombre: "profile.full_name",
    policy_number: "policy.policy_number",
  },
  sections: [
    {
      id: "datos",
      title: "Datos generales",
      fields: [
        { name: "agente_nombre", label: "Nombre del corredor/agente", type: "text", required: true },
        { name: "agente_clave", label: "Clave del agente", type: "text" },
        { name: "asegurado_nombre", label: "Nombre del asegurado", type: "text", required: true },
        { name: "policy_number", label: "Número de póliza", type: "text", required: true },
      ],
    },
    {
      id: "documentos",
      title: "Documentos adjuntos",
      kind: "dynamic_table",
      tableName: "documentos",
      maxRows: 20,
      columns: [
        { name: "tipo", label: "Tipo de documento", type: "text" },
        { name: "descripcion", label: "Descripción", type: "text" },
        { name: "folio", label: "Número de folio", type: "text" },
      ],
    },
    {
      id: "obs",
      title: "Observaciones",
      fields: [
        { name: "observaciones", label: "Observaciones generales", type: "textarea" },
      ],
    },
  ],
};

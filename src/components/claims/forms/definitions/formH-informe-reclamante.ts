import type { FormDefinition } from "../types";

export const formH: FormDefinition = {
  code: "H",
  name: "Informe del Reclamante",
  insurers: ["BANORTE"],
  autofill: {
    reclamante_nombre: "profile.full_name",
    parentesco: "profile.relationship_to_titular",
    telefono: "profile.telefono_celular",
  },
  sections: [
    {
      id: "datos",
      title: "Datos del reclamante",
      fields: [
        { name: "reclamante_nombre", label: "Nombre del reclamante", type: "text", required: true },
        { name: "parentesco", label: "Parentesco con el asegurado", type: "text" },
        { name: "telefono", label: "Teléfono de contacto", type: "tel", required: true },
      ],
    },
    {
      id: "siniestro",
      title: "Descripción del siniestro",
      fields: [
        { name: "descripcion_siniestro", label: "Narración libre del siniestro", type: "textarea", required: true },
      ],
    },
    {
      id: "documentos",
      title: "Documentos presentados",
      fields: [
        { name: "documentos", label: "Selecciona los presentados", type: "checkbox_group", options: [
          { value: "facturas", label: "Facturas originales" },
          { value: "recetas", label: "Recetas médicas" },
          { value: "lab", label: "Estudios de laboratorio" },
          { value: "imagen", label: "Estudios de imagen" },
          { value: "notas", label: "Notas médicas" },
          { value: "otro", label: "Otro" },
        ]},
        { name: "documentos_otro", label: "Especifique otro", type: "text",
          showWhen: (d) => Array.isArray(d.documentos) && d.documentos.includes("otro") },
      ],
    },
    {
      id: "bancarios",
      title: "Datos bancarios para depósito",
      fields: [
        { name: "banco", label: "Banco", type: "text", required: true },
        { name: "clabe", label: "CLABE interbancaria", type: "clabe", required: true },
        { name: "titular_cuenta", label: "Nombre del titular de la cuenta", type: "text", required: true },
      ],
    },
  ],
};

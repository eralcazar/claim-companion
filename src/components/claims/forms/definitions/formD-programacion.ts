import type { FormDefinition } from "../types";

export const formD: FormDefinition = {
  code: "D",
  name: "Programación de Servicios",
  insurers: ["AXA", "METLIFE"],
  autofill: {
    paternal_surname: "profile.paternal_surname",
    maternal_surname: "profile.maternal_surname",
    first_name: "profile.first_name",
    policy_number: "policy.policy_number",
    numero_certificado: "policy.numero_certificado",
  },
  sections: [
    {
      id: "asegurado",
      title: "Datos del asegurado",
      fields: [
        { name: "paternal_surname", label: "Apellido paterno", type: "text", required: true },
        { name: "maternal_surname", label: "Apellido materno", type: "text" },
        { name: "first_name", label: "Nombre(s)", type: "text", required: true },
        { name: "policy_number", label: "No. de Póliza", type: "text", required: true },
        { name: "numero_certificado", label: "No. de Certificado", type: "text" },
      ],
    },
    {
      id: "servicio",
      title: "Servicio solicitado",
      fields: [
        { name: "tipo_servicio", label: "Tipo de servicio", type: "select", required: true, options: [
          { value: "cirugia", label: "Cirugía" },
          { value: "consulta", label: "Consulta especialista" },
          { value: "estudio", label: "Estudio diagnóstico" },
          { value: "medicamento", label: "Medicamento" },
          { value: "otro", label: "Otro" },
        ]},
        { name: "especialidad", label: "Especialidad requerida", type: "text" },
        { name: "hospital_preferido", label: "Hospital o clínica preferida", type: "text" },
        { name: "med_solicitante", label: "Nombre del médico solicitante", type: "text" },
        { name: "med_cedula", label: "Cédula profesional", type: "text" },
        { name: "med_tel", label: "Teléfono del médico", type: "tel" },
        { name: "fecha_solicitada", label: "Fecha solicitada", type: "date", required: true },
        { name: "urgencia", label: "Nivel de urgencia", type: "radio", required: true, options: [
          { value: "normal", label: "Normal" }, { value: "urgente", label: "Urgente" },
        ]},
        { name: "descripcion", label: "Descripción del procedimiento o servicio", type: "textarea", required: true },
        { name: "diagnosis", label: "Diagnóstico que justifica el servicio", type: "text", required: true },
      ],
    },
  ],
};

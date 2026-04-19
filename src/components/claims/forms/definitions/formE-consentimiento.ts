import type { FormDefinition } from "../types";

const DECLARACION = `Declaro que se me ha explicado de manera clara, en lenguaje comprensible, en qué consiste el procedimiento o tratamiento médico que se me realizará, así como sus beneficios, riesgos, posibles complicaciones y alternativas de tratamiento. He tenido la oportunidad de hacer todas las preguntas que consideré necesarias y se me han contestado satisfactoriamente. Por lo anterior, otorgo mi consentimiento informado y autorizo al equipo médico tratante para llevar a cabo el procedimiento descrito en este documento.`;

export const formE: FormDefinition = {
  code: "E",
  name: "Consentimiento Informado",
  insurers: ["METLIFE"],
  autofill: {
    paternal_surname: "profile.paternal_surname",
    maternal_surname: "profile.maternal_surname",
    first_name: "profile.first_name",
    policy_number: "policy.policy_number",
  },
  sections: [
    {
      id: "asegurado",
      title: "Datos del asegurado",
      fields: [
        { name: "paternal_surname", label: "Apellido paterno", type: "text", required: true },
        { name: "maternal_surname", label: "Apellido materno", type: "text" },
        { name: "first_name", label: "Nombre(s)", type: "text", required: true },
        { name: "policy_number", label: "No. de Póliza", type: "text" },
      ],
    },
    {
      id: "procedimiento",
      title: "Procedimiento",
      fields: [
        { name: "procedimiento", label: "Procedimiento a realizar", type: "text", required: true },
        { name: "med_nombre", label: "Médico que realizará el procedimiento", type: "text", required: true },
        { name: "med_cedula", label: "Cédula profesional", type: "text" },
        { name: "med_especialidad", label: "Especialidad", type: "text" },
        { name: "hospital", label: "Hospital donde se realizará", type: "text", required: true },
        { name: "fecha_programada", label: "Fecha programada", type: "date", required: true },
        { name: "riesgos", label: "Descripción de riesgos explicados al paciente", type: "textarea", required: true },
        { name: "alternativas", label: "Alternativas de tratamiento explicadas", type: "textarea", required: true },
      ],
    },
    {
      id: "declaracion",
      title: "Declaración del paciente",
      fields: [
        { name: "declaracion", label: "Declaración", type: "static_text", text: DECLARACION },
      ],
    },
    {
      id: "firmas",
      title: "Firmas",
      fields: [
        { name: "firma_paciente", label: "Firma del paciente", type: "signature", required: true },
        { name: "firma_medico", label: "Firma del médico", type: "signature", required: true },
        { name: "lugar_fecha", label: "Lugar y fecha", type: "text", required: true },
      ],
    },
  ],
};

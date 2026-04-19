import type { FormDefinition } from "../types";

export const formC: FormDefinition = {
  code: "C",
  name: "Solicitud de Reembolso",
  insurers: ["AXA", "MAPFRE", "METLIFE"],
  autofill: {
    contractor_name: "policy.contractor_name",
    policy_number: "policy.policy_number",
    numero_certificado: "policy.numero_certificado",
    paternal_surname: "profile.paternal_surname",
    maternal_surname: "profile.maternal_surname",
    first_name: "profile.first_name",
    sex: "profile.sex",
    date_of_birth: "profile.date_of_birth",
  },
  sections: [
    {
      id: "general",
      title: "Información general",
      fields: [
        { name: "contractor_name", label: "Nombre del Contratante de la Póliza", type: "text", required: true },
        { name: "policy_number", label: "No. de Póliza", type: "text", required: true },
        { name: "numero_certificado", label: "No. de Certificado", type: "text" },
      ],
    },
    {
      id: "asegurado",
      title: "Datos del asegurado afectado",
      fields: [
        { name: "paternal_surname", label: "Apellido paterno", type: "text", required: true },
        { name: "maternal_surname", label: "Apellido materno", type: "text" },
        { name: "first_name", label: "Nombre(s)", type: "text", required: true },
        { name: "date_of_birth", label: "Fecha de nacimiento", type: "date", required: true },
        { name: "edad", label: "Edad", type: "computed_age", dobField: "date_of_birth" },
        { name: "sex", label: "Sexo", type: "radio", required: true, options: [
          { value: "M", label: "Masculino" }, { value: "F", label: "Femenino" },
        ]},
      ],
    },
    {
      id: "tipo_solicitud",
      title: "Tipo de solicitud",
      fields: [{
        name: "tipo_solicitud", label: "Selecciona los que apliquen", type: "checkbox_group",
        options: [
          { value: "reembolso", label: "Reembolso de gastos médicos" },
          { value: "valoracion", label: "Carta de valoración" },
          { value: "indemnizatorio", label: "Pago indemnizatorio" },
          { value: "ap_estudiante", label: "AP Estudiante" },
          { value: "maternidad", label: "Maternidad" },
          { value: "menor", label: "Gasto médico menor" },
        ],
      }],
    },
    {
      id: "facturas_check",
      title: "Facturas o recibos presentados",
      fields: [
        { name: "facturas_check", label: "Selecciona los que apliquen", type: "checkbox_group", options: [
          { value: "hospital", label: "Hospital" },
          { value: "honorarios", label: "Honorarios médicos" },
          { value: "medicamentos", label: "Medicamentos" },
          { value: "patologia", label: "Patología (biopsia)" },
          { value: "otro", label: "Otro(s)" },
        ]},
        { name: "facturas_otro_desc", label: "Especifique otro(s)", type: "text",
          showWhen: (d) => Array.isArray(d.facturas_check) && d.facturas_check.includes("otro") },
      ],
    },
    {
      id: "tipo_reclamacion",
      title: "Tipo de reclamación",
      fields: [
        { name: "tipo_reclamacion", label: "Reclamación", type: "radio", required: true, options: [
          { value: "inicial", label: "Inicial" }, { value: "complementaria", label: "Complementaria" },
        ]},
        { name: "siniestro_num", label: "Número de siniestro", type: "text",
          showWhen: (d) => d.tipo_reclamacion === "complementaria" },
        { name: "diagnosis", label: "Diagnóstico", type: "text", required: true },
      ],
    },
    {
      id: "aviso_accidente",
      title: "Aviso de accidente",
      fields: [{
        name: "accident_description", label: "Describa el lugar, cuándo y cómo ocurrió el evento", type: "textarea",
        helper: "Si se reportó con alguna autoridad y qué provocó la lesión",
      }],
    },
    {
      id: "gastos",
      title: "Tabla de gastos",
      kind: "dynamic_table",
      tableName: "gastos",
      maxRows: 10,
      showTotal: true,
      columns: [
        { name: "provider", label: "Proveedor", type: "text" },
        { name: "service_type", label: "Tipo de servicio", type: "select", options: [
          { value: "hospital", label: "Hospital" },
          { value: "honorarios", label: "Honorarios médicos" },
          { value: "medicamentos", label: "Medicamentos" },
          { value: "patologia", label: "Patología" },
          { value: "otros", label: "Otros" },
        ]},
        { name: "amount", label: "Monto ($)", type: "money" },
      ],
    },
    {
      id: "beneficiario",
      title: "Beneficiario del pago",
      fields: [
        { name: "ben_nombre", label: "Nombre del beneficiario", type: "text" },
        { name: "ben_tipo", label: "Tipo", type: "radio", options: [
          { value: "asegurado", label: "Asegurado" },
          { value: "contratante", label: "Contratante" },
          { value: "tutor", label: "Padre/Madre/Tutor" },
          { value: "otro", label: "Otro" },
        ]},
        { name: "ben_otro_just", label: "Justificación (si Otro)", type: "text",
          showWhen: (d) => d.ben_tipo === "otro" },
        { name: "ben_paternal", label: "Apellido paterno", type: "text",
          showWhen: (d) => d.ben_tipo && d.ben_tipo !== "asegurado" },
        { name: "ben_maternal", label: "Apellido materno", type: "text",
          showWhen: (d) => d.ben_tipo && d.ben_tipo !== "asegurado" },
        { name: "ben_first_name", label: "Nombre(s)", type: "text",
          showWhen: (d) => d.ben_tipo && d.ben_tipo !== "asegurado" },
        { name: "ben_dob", label: "Fecha de nacimiento", type: "date",
          showWhen: (d) => d.ben_tipo && d.ben_tipo !== "asegurado" },
        { name: "ben_edad", label: "Edad", type: "computed_age", dobField: "ben_dob",
          showWhen: (d) => d.ben_tipo && d.ben_tipo !== "asegurado" },
        { name: "ben_sex", label: "Sexo", type: "radio", options: [
          { value: "M", label: "Masculino" }, { value: "F", label: "Femenino" },
        ], showWhen: (d) => d.ben_tipo && d.ben_tipo !== "asegurado" },
        { name: "ben_pais", label: "País de nacimiento", type: "text",
          showWhen: (d) => d.ben_tipo && d.ben_tipo !== "asegurado" },
        { name: "ben_nacionalidad", label: "Nacionalidad", type: "text",
          showWhen: (d) => d.ben_tipo && d.ben_tipo !== "asegurado" },
        { name: "ben_ocupacion", label: "Ocupación / Profesión / Giro del negocio", type: "text",
          showWhen: (d) => d.ben_tipo && d.ben_tipo !== "asegurado" },
      ],
    },
    {
      id: "autorizaciones",
      title: "Autorizaciones",
      fields: [
        { name: "auth_text_1", label: "", type: "static_text",
          text: "1. Autorizo el tratamiento de mis datos personales sensibles y su transferencia a médicos especialistas en México y/o el extranjero, para el cumplimiento del contrato de seguro." },
        { name: "auth_1", label: "Sí acepto autorización 1", type: "checkbox", required: true },
        { name: "auth_text_2", label: "", type: "static_text",
          text: "2. Autorizo la transferencia de mis datos a programas de seguimiento médico, segunda opinión médica y alternativas de tratamiento." },
        { name: "auth_2", label: "Sí acepto autorización 2", type: "checkbox", required: true },
        { name: "auth_text_3", label: "", type: "static_text",
          text: "3. Autorizo la transferencia de mis datos de siniestralidad al agente o broker de la póliza." },
        { name: "auth_3", label: "Sí acepto autorización 3", type: "checkbox", required: true },
      ],
    },
    {
      id: "firmas",
      title: "Firmas y lugar",
      fields: [
        { name: "firma_afectado", label: "Firma del Asegurado afectado o representante legal", type: "signature", required: true },
        { name: "firma_titular", label: "Firma del Asegurado titular y/o Contratante", type: "signature", required: true },
        { name: "lugar_fecha", label: "Lugar y fecha", type: "text", required: true },
      ],
    },
  ],
};

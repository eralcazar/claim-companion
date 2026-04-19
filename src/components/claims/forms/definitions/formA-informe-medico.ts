import type { FormDefinition } from "../types";

export const formA: FormDefinition = {
  code: "A",
  name: "Informe Médico",
  insurers: ["ALLIANZ","AXA","BANORTE","BBVA","GNP","INBURSA","MAPFRE","METLIFE","PLAN SEGURO","SEGUROS MONTERREY"],
  autofill: {
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
      id: "tipo_tramite",
      title: "Tipo de trámite",
      fields: [{
        name: "tipo_tramite", label: "Tipo de trámite", type: "radio", required: true,
        options: [
          { value: "reembolso", label: "Reembolso" },
          { value: "prog_cirugia", label: "Programación de cirugía" },
          { value: "prog_medicamentos", label: "Programación de medicamentos" },
          { value: "prog_servicios", label: "Programación de servicios" },
          { value: "indemnizacion", label: "Indemnización" },
          { value: "reporte_hospitalario", label: "Reporte hospitalario" },
        ],
      }],
    },
    {
      id: "asegurado",
      title: "Datos del asegurado afectado",
      fields: [
        { name: "policy_number", label: "Número de póliza", type: "text", required: true },
        { name: "numero_certificado", label: "Número de certificado", type: "text" },
        { name: "paternal_surname", label: "Primer apellido", type: "text", required: true },
        { name: "maternal_surname", label: "Segundo apellido", type: "text" },
        { name: "first_name", label: "Nombre(s)", type: "text", required: true },
        { name: "sex", label: "Sexo", type: "radio", required: true, options: [
          { value: "F", label: "F" }, { value: "M", label: "M" },
        ]},
        { name: "date_of_birth", label: "Fecha de nacimiento", type: "date", required: true },
        { name: "edad", label: "Edad", type: "computed_age", dobField: "date_of_birth" },
        { name: "cause", label: "Causa de atención", type: "radio", required: true, options: [
          { value: "accidente", label: "Accidente" },
          { value: "enfermedad", label: "Enfermedad" },
          { value: "embarazo", label: "Embarazo" },
        ]},
      ],
    },
    {
      id: "historia",
      title: "Historia clínica",
      fields: [
        { name: "historia_clinica", label: "Historia clínica y tiempo de evolución", type: "textarea", required: true },
        { name: "symptom_start_date", label: "Fecha de inicio de síntomas", type: "date", required: true },
        { name: "first_attention_date", label: "Fecha de primera consulta", type: "date" },
      ],
    },
    {
      id: "signos",
      title: "Signos vitales y exploración física",
      fields: [
        { name: "pulso", label: "Pulso (x minuto)", type: "number" },
        { name: "respiracion", label: "Respiración (x minuto)", type: "number" },
        { name: "temperatura", label: "Temperatura (°C)", type: "number" },
        { name: "presion_arterial", label: "Presión arterial (mm Hg)", type: "text", placeholder: "120/80" },
        { name: "peso", label: "Peso (kg)", type: "number" },
        { name: "altura", label: "Altura (m)", type: "number" },
        { name: "exploracion_fisica", label: "Resultados de exploración física", type: "textarea" },
        { name: "estudios", label: "Estudios realizados / interpretaciones", type: "textarea",
          helper: "En caso de no realizarse, especificar que no se realizaron" },
        { name: "complicaciones", label: "Complicaciones", type: "radio", options: [
          { value: "si", label: "Sí" }, { value: "no", label: "No" },
        ]},
        { name: "fecha_complicaciones", label: "Fecha de inicio de complicaciones", type: "date",
          showWhen: (d) => d.complicaciones === "si" },
        { name: "tratamiento_desc", label: "Tratamiento (descripción con fechas y posología)", type: "textarea", required: true },
        { name: "fecha_tratamiento", label: "Fecha de inicio del tratamiento", type: "date" },
      ],
    },
    {
      id: "medico_tratante",
      title: "Datos del médico tratante",
      fields: [
        { name: "med_tipo", label: "Tipo", type: "radio", options: [
          { value: "tratante", label: "Tratante" },
          { value: "cirujano", label: "Cirujano" },
          { value: "otra", label: "Otra" },
        ]},
        { name: "med_tipo_otra", label: "¿Cuál?", type: "text", showWhen: (d) => d.med_tipo === "otra" },
        { name: "med_paternal", label: "Primer apellido", type: "text", required: true },
        { name: "med_maternal", label: "Segundo apellido", type: "text" },
        { name: "med_first_name", label: "Nombre(s)", type: "text", required: true },
        { name: "med_specialty", label: "Especialidad", type: "text" },
        { name: "med_license", label: "Cédula profesional", type: "text" },
        { name: "med_specialty_license", label: "Cédula de especialidad", type: "text" },
        { name: "med_fees", label: "Presupuesto de honorarios ($)", type: "money" },
        { name: "med_signature", label: "Firma del médico", type: "signature" },
        { name: "med_seal", label: "Sello del médico", type: "image_upload" },
      ],
    },
    {
      id: "interconsultantes",
      title: "Médicos interconsultantes",
      kind: "dynamic_doctors",
      doctorsName: "interconsultantes",
      maxDoctors: 3,
      description: "Hasta 3 médicos. Agrega los que participan en la atención.",
    },
  ],
};

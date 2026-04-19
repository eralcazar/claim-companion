import type { FormDefinition } from "../types";
import { TIPOS_IDENTIFICACION } from "@/lib/constants";

export const formF: FormDefinition = {
  code: "F",
  name: "Identificación del Cliente — Persona Física",
  insurers: ["ALLIANZ"],
  autofill: {
    paternal_surname: "profile.paternal_surname",
    maternal_surname: "profile.maternal_surname",
    first_name: "profile.first_name",
    rfc: "profile.rfc",
    curp: "profile.curp",
    date_of_birth: "profile.date_of_birth",
    birth_state: "profile.birth_state",
    nationality: "profile.nationality",
    street: "profile.street",
    street_number: "profile.street_number",
    interior_number: "profile.interior_number",
    neighborhood: "profile.neighborhood",
    postal_code: "profile.postal_code",
    municipality: "profile.municipality",
    state: "profile.state",
    phone: "profile.phone",
    telefono_celular: "profile.telefono_celular",
    email: "profile.email",
    tipo_identificacion: "profile.tipo_identificacion",
    numero_identificacion: "profile.numero_identificacion",
    vigencia_identificacion: "profile.vigencia_identificacion",
    es_pep: "profile.es_pep",
    cargo_pep: "profile.cargo_pep",
  },
  sections: [
    {
      id: "personales",
      title: "Datos personales",
      fields: [
        { name: "paternal_surname", label: "Apellido Paterno", type: "text", required: true },
        { name: "maternal_surname", label: "Apellido Materno", type: "text" },
        { name: "first_name", label: "Nombre(s)", type: "text", required: true },
        { name: "rfc", label: "RFC", type: "rfc", required: true },
        { name: "curp", label: "CURP", type: "curp", required: true },
        { name: "date_of_birth", label: "Fecha de nacimiento", type: "date", required: true },
        { name: "birth_state", label: "Lugar de nacimiento", type: "text" },
        { name: "nationality", label: "Nacionalidad", type: "text" },
      ],
    },
    {
      id: "domicilio",
      title: "Domicilio",
      fields: [
        { name: "street", label: "Calle", type: "text" },
        { name: "street_number", label: "No. Ext", type: "text" },
        { name: "interior_number", label: "No. Int", type: "text" },
        { name: "neighborhood", label: "Colonia", type: "text" },
        { name: "postal_code", label: "C.P.", type: "text" },
        { name: "municipality", label: "Ciudad", type: "text" },
        { name: "state", label: "Estado", type: "text" },
      ],
    },
    {
      id: "contacto",
      title: "Contacto",
      fields: [
        { name: "phone", label: "Teléfono fijo", type: "tel" },
        { name: "telefono_celular", label: "Celular", type: "tel" },
        { name: "email", label: "Correo electrónico", type: "email" },
      ],
    },
    {
      id: "identificacion",
      title: "Identificación oficial",
      fields: [
        { name: "tipo_identificacion", label: "Tipo de identificación", type: "select", options: TIPOS_IDENTIFICACION.map((o) => ({ value: o.value, label: o.label })) },
        { name: "numero_identificacion", label: "Número de identificación", type: "text" },
        { name: "vigencia_identificacion", label: "Vigencia", type: "date" },
      ],
    },
    {
      id: "pep",
      title: "Persona Políticamente Expuesta",
      fields: [
        { name: "es_pep", label: "¿Es PEP?", type: "radio", required: true, options: [
          { value: "si", label: "Sí" }, { value: "no", label: "No" },
        ]},
        { name: "cargo_pep", label: "Cargo que desempeña o desempeñó", type: "text",
          showWhen: (d) => d.es_pep === "si" || d.es_pep === true },
      ],
    },
  ],
};

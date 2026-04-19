// Coordenadas absolutas (pdf-lib: origen en esquina inferior izquierda).
// Tamaño de página carta: 612 x 792 puntos.
// Estas coordenadas son aproximadas; ajustar visualmente comparando con el PDF original.

export interface CoordField {
  key: string;
  page: number;
  x: number;
  y: number;
  fontSize?: number;
  maxWidth?: number;
}

export interface FormCoordinates {
  storagePath: string;
  fields: CoordField[];
  page1Fields?: CoordField[];
  page2Fields?: CoordField[];
  page3Fields?: CoordField[];
}

export const formCoordinates = {
  // ══════════════════════════════════════════
  // GNP — AVISO DE ACCIDENTE O ENFERMEDAD
  // ══════════════════════════════════════════
  GNP_aviso_accidente: {
    storagePath: "GNP/aviso_accidente.pdf",
    fields: [
      { key: "numero_poliza", page: 0, x: 460, y: 710, fontSize: 8 },
      { key: "fecha_dia", page: 0, x: 541, y: 710, fontSize: 8 },
      { key: "fecha_mes", page: 0, x: 558, y: 710, fontSize: 8 },
      { key: "fecha_año", page: 0, x: 575, y: 710, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 90, y: 690, fontSize: 8 },
      { key: "apellido_materno", page: 0, x: 245, y: 690, fontSize: 8 },
      { key: "nombres", page: 0, x: 390, y: 690, fontSize: 8 },
      { key: "codigo_cliente", page: 0, x: 475, y: 690, fontSize: 8 },
      { key: "rfc_l1", page: 0, x: 92, y: 666, fontSize: 8 },
      { key: "rfc_l2", page: 0, x: 100, y: 666, fontSize: 8 },
      { key: "rfc_l3", page: 0, x: 108, y: 666, fontSize: 8 },
      { key: "rfc_l4", page: 0, x: 116, y: 666, fontSize: 8 },
      { key: "rfc_a1", page: 0, x: 136, y: 666, fontSize: 8 },
      { key: "rfc_a2", page: 0, x: 144, y: 666, fontSize: 8 },
      { key: "rfc_m1", page: 0, x: 162, y: 666, fontSize: 8 },
      { key: "rfc_m2", page: 0, x: 170, y: 666, fontSize: 8 },
      { key: "rfc_d1", page: 0, x: 186, y: 666, fontSize: 8 },
      { key: "rfc_d2", page: 0, x: 194, y: 666, fontSize: 8 },
      { key: "rfc_h1", page: 0, x: 213, y: 666, fontSize: 8 },
      { key: "rfc_h2", page: 0, x: 221, y: 666, fontSize: 8 },
      { key: "rfc_h3", page: 0, x: 229, y: 666, fontSize: 8 },
      { key: "curp", page: 0, x: 260, y: 666, fontSize: 7, maxWidth: 160 },
      { key: "nacionalidad", page: 0, x: 90, y: 645, fontSize: 8 },
      { key: "ocupacion", page: 0, x: 420, y: 645, fontSize: 8 },
      { key: "giro_negocio", page: 0, x: 90, y: 627, fontSize: 8 },
      { key: "definir_cargo", page: 0, x: 90, y: 609, fontSize: 8 },
      { key: "correo", page: 0, x: 370, y: 609, fontSize: 8 },
      { key: "check_soltero", page: 0, x: 474, y: 648, fontSize: 8 },
      { key: "check_casado", page: 0, x: 474, y: 637, fontSize: 8 },
      { key: "check_divorciado", page: 0, x: 529, y: 648, fontSize: 8 },
      { key: "check_viudo", page: 0, x: 529, y: 637, fontSize: 8 },
      { key: "check_concubinato", page: 0, x: 573, y: 637, fontSize: 8 },
      { key: "check_pep_si", page: 0, x: 582, y: 630, fontSize: 8 },
      { key: "check_pep_no", page: 0, x: 582, y: 619, fontSize: 8 },
      { key: "check_masculino", page: 0, x: 556, y: 672, fontSize: 8 },
      { key: "check_femenino", page: 0, x: 556, y: 661, fontSize: 8 },
      { key: "calle", page: 0, x: 90, y: 588, fontSize: 8, maxWidth: 280 },
      { key: "num_exterior", page: 0, x: 450, y: 588, fontSize: 8 },
      { key: "num_interior", page: 0, x: 540, y: 588, fontSize: 8 },
      { key: "colonia", page: 0, x: 90, y: 570, fontSize: 8, maxWidth: 200 },
      { key: "cp", page: 0, x: 420, y: 570, fontSize: 8 },
    ],
    page1Fields: [
      { key: "correo2", page: 1, x: 90, y: 740, fontSize: 8 },
      { key: "relacion_titular", page: 1, x: 370, y: 740, fontSize: 8 },
      { key: "razon_social", page: 1, x: 90, y: 700, fontSize: 8, maxWidth: 280 },
      { key: "codigo_cliente_pm", page: 1, x: 430, y: 700, fontSize: 8 },
      { key: "rfc_pm", page: 1, x: 90, y: 678, fontSize: 8 },
      { key: "giro_pm", page: 1, x: 280, y: 678, fontSize: 8, maxWidth: 200 },
      { key: "correo_pm", page: 1, x: 90, y: 658, fontSize: 8, maxWidth: 300 },
      { key: "rep_apellido_pat", page: 1, x: 90, y: 628, fontSize: 8 },
      { key: "rep_apellido_mat", page: 1, x: 245, y: 628, fontSize: 8 },
      { key: "rep_nombres", page: 1, x: 400, y: 628, fontSize: 8 },
      { key: "dom_calle", page: 1, x: 90, y: 598, fontSize: 8, maxWidth: 280 },
      { key: "dom_num_ext", page: 1, x: 450, y: 598, fontSize: 8 },
      { key: "dom_num_int", page: 1, x: 530, y: 598, fontSize: 8 },
      { key: "dom_colonia", page: 1, x: 90, y: 578, fontSize: 8, maxWidth: 200 },
      { key: "dom_cp", page: 1, x: 390, y: 578, fontSize: 8 },
      { key: "dom_municipio", page: 1, x: 440, y: 578, fontSize: 8, maxWidth: 120 },
    ],
    page2Fields: [
      { key: "agente_nombre", page: 2, x: 90, y: 480, fontSize: 8 },
      { key: "agente_clave", page: 2, x: 310, y: 480, fontSize: 8 },
      { key: "agente_telefono", page: 2, x: 420, y: 480, fontSize: 8 },
      { key: "agente_estado", page: 2, x: 530, y: 480, fontSize: 8 },
    ],
  },

  // ══════════════════════════════════════════
  // GNP — INFORME MÉDICO
  // ══════════════════════════════════════════
  GNP_informe_medico: {
    storagePath: "GNP/informe_medico.pdf",
    fields: [
      { key: "check_reembolso", page: 0, x: 95, y: 730, fontSize: 8 },
      { key: "check_prog_cirugia", page: 0, x: 173, y: 730, fontSize: 8 },
      { key: "check_prog_medicamentos", page: 0, x: 278, y: 730, fontSize: 8 },
      { key: "check_prog_servicios", page: 0, x: 380, y: 730, fontSize: 8 },
      { key: "check_indemnizacion", page: 0, x: 468, y: 730, fontSize: 8 },
      { key: "check_reporte_hosp", page: 0, x: 545, y: 730, fontSize: 8 },
      { key: "numero_poliza", page: 0, x: 90, y: 700, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 180, y: 700, fontSize: 8 },
      { key: "apellido_materno", page: 0, x: 310, y: 700, fontSize: 8 },
      { key: "nombres", page: 0, x: 420, y: 700, fontSize: 8 },
      { key: "check_sexo_f", page: 0, x: 90, y: 680, fontSize: 8 },
      { key: "check_sexo_m", page: 0, x: 118, y: 680, fontSize: 8 },
      { key: "edad", page: 0, x: 185, y: 680, fontSize: 8 },
      { key: "check_causa_accidente", page: 0, x: 295, y: 680, fontSize: 8 },
      { key: "check_causa_enfermedad", page: 0, x: 370, y: 680, fontSize: 8 },
      { key: "check_causa_embarazo", page: 0, x: 455, y: 680, fontSize: 8 },
      { key: "historia_clinica", page: 0, x: 90, y: 645, fontSize: 8, maxWidth: 440 },
    ],
    page1Fields: [
      { key: "pulso", page: 1, x: 90, y: 760, fontSize: 8 },
      { key: "respiracion", page: 1, x: 185, y: 760, fontSize: 8 },
      { key: "temperatura", page: 1, x: 290, y: 760, fontSize: 8 },
      { key: "presion_arterial", page: 1, x: 390, y: 760, fontSize: 8 },
      { key: "peso", page: 1, x: 480, y: 760, fontSize: 8 },
      { key: "altura", page: 1, x: 550, y: 760, fontSize: 8 },
      { key: "exploracion_fisica", page: 1, x: 90, y: 720, fontSize: 8, maxWidth: 440 },
      { key: "estudios_realizados", page: 1, x: 90, y: 660, fontSize: 8, maxWidth: 440 },
      { key: "check_complicaciones_si", page: 1, x: 90, y: 625, fontSize: 8 },
      { key: "check_complicaciones_no", page: 1, x: 120, y: 625, fontSize: 8 },
      { key: "fecha_inicio_complic", page: 1, x: 430, y: 625, fontSize: 8 },
      { key: "tratamiento", page: 1, x: 90, y: 590, fontSize: 8, maxWidth: 440 },
      { key: "fecha_inicio_trat", page: 1, x: 430, y: 590, fontSize: 8 },
    ],
    page2Fields: [
      { key: "check_tipo_tratante", page: 2, x: 90, y: 755, fontSize: 8 },
      { key: "check_tipo_cirujano", page: 2, x: 165, y: 755, fontSize: 8 },
      { key: "med1_apellido_pat", page: 2, x: 90, y: 735, fontSize: 8 },
      { key: "med1_apellido_mat", page: 2, x: 220, y: 735, fontSize: 8 },
      { key: "med1_nombres", page: 2, x: 350, y: 735, fontSize: 8 },
      { key: "med1_especialidad", page: 2, x: 470, y: 735, fontSize: 8 },
      { key: "med1_cedula_prof", page: 2, x: 90, y: 715, fontSize: 8 },
      { key: "med1_cedula_esp", page: 2, x: 245, y: 715, fontSize: 8 },
      { key: "med1_honorarios", page: 2, x: 400, y: 715, fontSize: 8 },
      { key: "med2_tipo", page: 2, x: 90, y: 680, fontSize: 8 },
      { key: "med2_apellido_pat", page: 2, x: 90, y: 660, fontSize: 8 },
      { key: "med2_apellido_mat", page: 2, x: 220, y: 660, fontSize: 8 },
      { key: "med2_nombres", page: 2, x: 350, y: 660, fontSize: 8 },
      { key: "med2_especialidad", page: 2, x: 470, y: 660, fontSize: 8 },
      { key: "med2_cedula_prof", page: 2, x: 90, y: 640, fontSize: 8 },
      { key: "med2_cedula_esp", page: 2, x: 245, y: 640, fontSize: 8 },
      { key: "med2_honorarios", page: 2, x: 400, y: 640, fontSize: 8 },
      { key: "med3_tipo", page: 2, x: 90, y: 605, fontSize: 8 },
      { key: "med3_apellido_pat", page: 2, x: 90, y: 585, fontSize: 8 },
      { key: "med3_apellido_mat", page: 2, x: 220, y: 585, fontSize: 8 },
      { key: "med3_nombres", page: 2, x: 350, y: 585, fontSize: 8 },
      { key: "med3_especialidad", page: 2, x: 470, y: 585, fontSize: 8 },
      { key: "med3_cedula_prof", page: 2, x: 90, y: 565, fontSize: 8 },
      { key: "med3_cedula_esp", page: 2, x: 245, y: 565, fontSize: 8 },
      { key: "med3_honorarios", page: 2, x: 400, y: 565, fontSize: 8 },
    ],
  },

  // ══════════════════════════════════════════
  // AXA — REEMBOLSO
  // ══════════════════════════════════════════
  AXA_reembolso: {
    storagePath: "AXA/reembolso.pdf",
    fields: [
      { key: "nombre_contratante", page: 0, x: 90, y: 710, fontSize: 8, maxWidth: 320 },
      { key: "numero_poliza", page: 0, x: 430, y: 710, fontSize: 8 },
      { key: "numero_certificado", page: 0, x: 510, y: 710, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 90, y: 680, fontSize: 8 },
      { key: "apellido_materno", page: 0, x: 260, y: 680, fontSize: 8 },
      { key: "nombres", page: 0, x: 430, y: 680, fontSize: 8 },
      { key: "edad", page: 0, x: 90, y: 660, fontSize: 8 },
      { key: "check_sexo_m", page: 0, x: 147, y: 660, fontSize: 8 },
      { key: "check_sexo_f", page: 0, x: 182, y: 660, fontSize: 8 },
      { key: "fecha_nac_dia", page: 0, x: 295, y: 660, fontSize: 8 },
      { key: "fecha_nac_mes", page: 0, x: 330, y: 660, fontSize: 8 },
      { key: "fecha_nac_año", page: 0, x: 358, y: 660, fontSize: 8 },
    ],
    page1Fields: [
      { key: "check_reembolso_gm", page: 1, x: 90, y: 760, fontSize: 8 },
      { key: "check_carta_valoracion", page: 1, x: 210, y: 760, fontSize: 8 },
      { key: "check_pago_indem", page: 1, x: 385, y: 760, fontSize: 8 },
      { key: "check_ap_estudiante", page: 1, x: 90, y: 748, fontSize: 8 },
      { key: "check_maternidad", page: 1, x: 210, y: 748, fontSize: 8 },
      { key: "check_gasto_menor", page: 1, x: 385, y: 748, fontSize: 8 },
      { key: "check_hospital", page: 1, x: 90, y: 720, fontSize: 8 },
      { key: "check_honorarios", page: 1, x: 250, y: 720, fontSize: 8 },
      { key: "check_otros", page: 1, x: 410, y: 720, fontSize: 8 },
      { key: "otros_especifique", page: 1, x: 430, y: 720, fontSize: 8 },
      { key: "check_medicamentos", page: 1, x: 90, y: 708, fontSize: 8 },
      { key: "check_patologia", page: 1, x: 250, y: 708, fontSize: 8 },
      { key: "check_inicial", page: 1, x: 90, y: 685, fontSize: 8 },
      { key: "check_complementaria", page: 1, x: 155, y: 685, fontSize: 8 },
      { key: "numero_siniestro", page: 1, x: 250, y: 685, fontSize: 8 },
      { key: "diagnostico", page: 1, x: 390, y: 685, fontSize: 8, maxWidth: 180 },
      { key: "desc_accidente", page: 1, x: 90, y: 655, fontSize: 8, maxWidth: 440 },
    ],
    page2Fields: [
      { key: "gasto1_proveedor", page: 2, x: 90, y: 740, fontSize: 7 },
      { key: "gasto1_servicio", page: 2, x: 290, y: 740, fontSize: 7 },
      { key: "gasto1_monto", page: 2, x: 490, y: 740, fontSize: 7 },
      { key: "gasto2_proveedor", page: 2, x: 90, y: 726, fontSize: 7 },
      { key: "gasto2_servicio", page: 2, x: 290, y: 726, fontSize: 7 },
      { key: "gasto2_monto", page: 2, x: 490, y: 726, fontSize: 7 },
      { key: "gasto3_proveedor", page: 2, x: 90, y: 712, fontSize: 7 },
      { key: "gasto3_servicio", page: 2, x: 290, y: 712, fontSize: 7 },
      { key: "gasto3_monto", page: 2, x: 490, y: 712, fontSize: 7 },
      { key: "gasto4_proveedor", page: 2, x: 90, y: 698, fontSize: 7 },
      { key: "gasto4_servicio", page: 2, x: 290, y: 698, fontSize: 7 },
      { key: "gasto4_monto", page: 2, x: 490, y: 698, fontSize: 7 },
      { key: "gasto5_proveedor", page: 2, x: 90, y: 684, fontSize: 7 },
      { key: "gasto5_servicio", page: 2, x: 290, y: 684, fontSize: 7 },
      { key: "gasto5_monto", page: 2, x: 490, y: 684, fontSize: 7 },
      { key: "total_gastos", page: 2, x: 490, y: 615, fontSize: 8 },
      { key: "nombre_beneficiario", page: 2, x: 90, y: 580, fontSize: 8, maxWidth: 300 },
      { key: "check_ben_asegurado", page: 2, x: 90, y: 560, fontSize: 8 },
      { key: "check_ben_contratante", page: 2, x: 175, y: 560, fontSize: 8 },
      { key: "check_ben_padre", page: 2, x: 280, y: 560, fontSize: 8 },
      { key: "check_ben_otro", page: 2, x: 380, y: 560, fontSize: 8 },
      { key: "ben_justificacion", page: 2, x: 395, y: 560, fontSize: 8 },
    ],
    page3Fields: [
      { key: "lugar_fecha", page: 3, x: 380, y: 120, fontSize: 8 },
    ],
  },

  // ══════════════════════════════════════════
  // METLIFE — REEMBOLSO
  // ══════════════════════════════════════════
  METLIFE_reembolso: {
    storagePath: "METLIFE/reembolso.pdf",
    fields: [
      { key: "numero_poliza", page: 0, x: 90, y: 710, fontSize: 8 },
      { key: "numero_certificado", page: 0, x: 280, y: 710, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 90, y: 685, fontSize: 8 },
      { key: "apellido_materno", page: 0, x: 245, y: 685, fontSize: 8 },
      { key: "nombres", page: 0, x: 400, y: 685, fontSize: 8 },
      { key: "diagnostico", page: 0, x: 90, y: 660, fontSize: 8, maxWidth: 440 },
      { key: "total_reclamado", page: 0, x: 430, y: 580, fontSize: 8 },
      { key: "clabe", page: 0, x: 90, y: 540, fontSize: 8 },
      { key: "banco", page: 0, x: 360, y: 540, fontSize: 8 },
      { key: "titular_cuenta", page: 0, x: 90, y: 520, fontSize: 8, maxWidth: 440 },
      { key: "lugar_fecha", page: 0, x: 90, y: 120, fontSize: 8 },
    ],
  },

  // ══════════════════════════════════════════
  // BANORTE — INFORME DEL RECLAMANTE
  // ══════════════════════════════════════════
  BANORTE_informe_reclamante: {
    storagePath: "BANORTE/informe_reclamante.PDF",
    fields: [
      { key: "nombre_reclamante", page: 0, x: 90, y: 700, fontSize: 8, maxWidth: 350 },
      { key: "parentesco", page: 0, x: 90, y: 678, fontSize: 8 },
      { key: "telefono", page: 0, x: 360, y: 678, fontSize: 8 },
      { key: "desc_siniestro", page: 0, x: 90, y: 640, fontSize: 8, maxWidth: 440 },
      { key: "clabe", page: 0, x: 90, y: 200, fontSize: 8 },
      { key: "banco", page: 0, x: 360, y: 200, fontSize: 8 },
      { key: "titular_cuenta", page: 0, x: 90, y: 180, fontSize: 8, maxWidth: 440 },
    ],
  },

  // ══════════════════════════════════════════
  // BBVA — INFORME MÉDICO
  // ══════════════════════════════════════════
  BBVA_informe_medico: {
    storagePath: "BBVA/informe_medico.pdf",
    fields: [
      { key: "numero_poliza", page: 0, x: 90, y: 720, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 90, y: 700, fontSize: 8 },
      { key: "apellido_materno", page: 0, x: 245, y: 700, fontSize: 8 },
      { key: "nombres", page: 0, x: 400, y: 700, fontSize: 8 },
      { key: "diagnostico", page: 0, x: 90, y: 670, fontSize: 8, maxWidth: 440 },
      { key: "tratamiento", page: 0, x: 90, y: 620, fontSize: 8, maxWidth: 440 },
      { key: "med1_nombre", page: 0, x: 90, y: 400, fontSize: 8 },
      { key: "med1_cedula", page: 0, x: 320, y: 400, fontSize: 8 },
      { key: "med1_especialidad", page: 0, x: 90, y: 382, fontSize: 8 },
    ],
  },

  // ══════════════════════════════════════════
  // MAPFRE — REEMBOLSO
  // ══════════════════════════════════════════
  MAPFRE_reembolso: {
    storagePath: "MAPFRE/reembolso.pdf",
    fields: [
      { key: "numero_poliza", page: 0, x: 90, y: 715, fontSize: 8 },
      { key: "numero_certificado", page: 0, x: 280, y: 715, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 90, y: 690, fontSize: 8 },
      { key: "apellido_materno", page: 0, x: 245, y: 690, fontSize: 8 },
      { key: "nombres", page: 0, x: 400, y: 690, fontSize: 8 },
      { key: "diagnostico", page: 0, x: 90, y: 660, fontSize: 8, maxWidth: 440 },
      { key: "total_reclamado", page: 0, x: 450, y: 560, fontSize: 8 },
      { key: "clabe", page: 0, x: 90, y: 380, fontSize: 8 },
      { key: "banco", page: 0, x: 360, y: 380, fontSize: 8 },
    ],
  },

  // Plantillas base — coordenadas a calibrar
  ALLIANZ_informe_medico: {
    storagePath: "ALLIANZ/informe_medico.pdf",
    fields: [
      { key: "numero_poliza", page: 0, x: 90, y: 720, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 90, y: 698, fontSize: 8 },
      { key: "apellido_materno", page: 0, x: 245, y: 698, fontSize: 8 },
      { key: "nombres", page: 0, x: 400, y: 698, fontSize: 8 },
      { key: "diagnostico", page: 0, x: 90, y: 660, fontSize: 8, maxWidth: 440 },
      { key: "tratamiento", page: 0, x: 90, y: 600, fontSize: 8, maxWidth: 440 },
    ],
  },
  INBURSA_informe_medico: {
    storagePath: "INBURSA/informe_medico.pdf",
    fields: [
      { key: "numero_poliza", page: 0, x: 90, y: 720, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 90, y: 698, fontSize: 8 },
      { key: "nombres", page: 0, x: 400, y: 698, fontSize: 8 },
      { key: "diagnostico", page: 0, x: 90, y: 660, fontSize: 8, maxWidth: 440 },
    ],
  },
  "PLAN SEGURO_informe_medico": {
    storagePath: "PLAN_SEGURO/informe_medico.pdf",
    fields: [
      { key: "numero_poliza", page: 0, x: 90, y: 720, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 90, y: 698, fontSize: 8 },
      { key: "nombres", page: 0, x: 400, y: 698, fontSize: 8 },
      { key: "diagnostico", page: 0, x: 90, y: 660, fontSize: 8, maxWidth: 440 },
    ],
  },
  "SEGUROS MONTERREY_informe_medico": {
    storagePath: "SEGUROS_MONTERREY/informe_medico.pdf",
    fields: [
      { key: "numero_poliza", page: 0, x: 90, y: 720, fontSize: 8 },
      { key: "apellido_paterno", page: 0, x: 90, y: 698, fontSize: 8 },
      { key: "nombres", page: 0, x: 400, y: 698, fontSize: 8 },
      { key: "diagnostico", page: 0, x: 90, y: 660, fontSize: 8, maxWidth: 440 },
    ],
  },
} satisfies Record<string, FormCoordinates>;

export type FormCoordinatesKey = keyof typeof formCoordinates;

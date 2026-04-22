export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment_documents: {
        Row: {
          appointment_id: string
          created_at: string
          document_category: Database["public"]["Enums"]["appointment_document_category"]
          file_name: string
          file_path: string
          file_type: string
          id: string
          uploaded_by: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          document_category?: Database["public"]["Enums"]["appointment_document_category"]
          file_name?: string
          file_path: string
          file_type?: string
          id?: string
          uploaded_by: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          document_category?: Database["public"]["Enums"]["appointment_document_category"]
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          address: string | null
          address_lat: number | null
          address_lng: number | null
          appointment_date: string
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          created_at: string
          doctor_id: string | null
          doctor_name_manual: string | null
          doctor_observations: string | null
          id: string
          notes: string | null
          reminder_enabled: boolean
          reminder_minutes_before: number | null
          reminder_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          address_lat?: number | null
          address_lng?: number | null
          appointment_date: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          created_at?: string
          doctor_id?: string | null
          doctor_name_manual?: string | null
          doctor_observations?: string | null
          id?: string
          notes?: string | null
          reminder_enabled?: boolean
          reminder_minutes_before?: number | null
          reminder_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          address_lat?: number | null
          address_lng?: number | null
          appointment_date?: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          created_at?: string
          doctor_id?: string | null
          doctor_name_manual?: string | null
          doctor_observations?: string | null
          id?: string
          notes?: string | null
          reminder_enabled?: boolean
          reminder_minutes_before?: number | null
          reminder_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      aseguradoras: {
        Row: {
          activa: boolean
          carpeta_storage: string
          color_primario: string
          created_at: string
          id: string
          nombre: string
          slug: string
        }
        Insert: {
          activa?: boolean
          carpeta_storage: string
          color_primario?: string
          created_at?: string
          id?: string
          nombre: string
          slug: string
        }
        Update: {
          activa?: boolean
          carpeta_storage?: string
          color_primario?: string
          created_at?: string
          id?: string
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      broker_patients: {
        Row: {
          broker_id: string
          created_at: string
          id: string
          patient_id: string
        }
        Insert: {
          broker_id: string
          created_at?: string
          id?: string
          patient_id: string
        }
        Update: {
          broker_id?: string
          created_at?: string
          id?: string
          patient_id?: string
        }
        Relationships: []
      }
      campos: {
        Row: {
          campo_alto: number | null
          campo_ancho: number | null
          campo_pagina: number | null
          campo_x: number | null
          campo_y: number | null
          clave: string
          created_at: string
          descripcion: string | null
          etiqueta: string | null
          formulario_id: string
          id: string
          label_alto: number | null
          label_ancho: number | null
          label_pagina: number | null
          label_x: number | null
          label_y: number | null
          longitud_max: number | null
          mapeo_medico: string | null
          mapeo_perfil: string | null
          mapeo_poliza: string | null
          mapeo_siniestro: string | null
          opciones: Json | null
          orden: number
          origen: string
          patron_validacion: string | null
          requerido: boolean
          seccion_id: string | null
          tipo: string
          updated_at: string
          valor_defecto: string | null
        }
        Insert: {
          campo_alto?: number | null
          campo_ancho?: number | null
          campo_pagina?: number | null
          campo_x?: number | null
          campo_y?: number | null
          clave: string
          created_at?: string
          descripcion?: string | null
          etiqueta?: string | null
          formulario_id: string
          id?: string
          label_alto?: number | null
          label_ancho?: number | null
          label_pagina?: number | null
          label_x?: number | null
          label_y?: number | null
          longitud_max?: number | null
          mapeo_medico?: string | null
          mapeo_perfil?: string | null
          mapeo_poliza?: string | null
          mapeo_siniestro?: string | null
          opciones?: Json | null
          orden?: number
          origen?: string
          patron_validacion?: string | null
          requerido?: boolean
          seccion_id?: string | null
          tipo?: string
          updated_at?: string
          valor_defecto?: string | null
        }
        Update: {
          campo_alto?: number | null
          campo_ancho?: number | null
          campo_pagina?: number | null
          campo_x?: number | null
          campo_y?: number | null
          clave?: string
          created_at?: string
          descripcion?: string | null
          etiqueta?: string | null
          formulario_id?: string
          id?: string
          label_alto?: number | null
          label_ancho?: number | null
          label_pagina?: number | null
          label_x?: number | null
          label_y?: number | null
          longitud_max?: number | null
          mapeo_medico?: string | null
          mapeo_perfil?: string | null
          mapeo_poliza?: string | null
          mapeo_siniestro?: string | null
          opciones?: Json | null
          orden?: number
          origen?: string
          patron_validacion?: string | null
          requerido?: boolean
          seccion_id?: string | null
          tipo?: string
          updated_at?: string
          valor_defecto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_mapeo_medico_fkey"
            columns: ["mapeo_medico"]
            isOneToOne: false
            referencedRelation: "mapeo_medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_mapeo_perfil_fkey"
            columns: ["mapeo_perfil"]
            isOneToOne: false
            referencedRelation: "mapeo_perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_mapeo_poliza_fkey"
            columns: ["mapeo_poliza"]
            isOneToOne: false
            referencedRelation: "mapeo_polizas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_mapeo_siniestro_fkey"
            columns: ["mapeo_siniestro"]
            isOneToOne: false
            referencedRelation: "mapeo_siniestros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campos_seccion_id_fkey"
            columns: ["seccion_id"]
            isOneToOne: false
            referencedRelation: "secciones"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_documents: {
        Row: {
          claim_id: string
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          tipo_documento: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          file_name?: string
          file_path: string
          file_type?: string
          id?: string
          tipo_documento?: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_forms: {
        Row: {
          created_at: string
          data: Json
          error_message: string | null
          folio: string | null
          form_code: string
          id: string
          insurer: string
          pdf_path: string | null
          policy_id: string | null
          status: string
          tramite_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          error_message?: string | null
          folio?: string | null
          form_code: string
          id?: string
          insurer: string
          pdf_path?: string | null
          policy_id?: string | null
          status?: string
          tramite_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          error_message?: string | null
          folio?: string | null
          form_code?: string
          id?: string
          insurer?: string
          pdf_path?: string | null
          policy_id?: string | null
          status?: string
          tramite_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          cause: string | null
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at: string
          diagnosis: string
          first_attention_date: string | null
          form_data: Json | null
          id: string
          incident_date: string
          is_initial_claim: boolean | null
          notes: string | null
          policy_id: string
          prior_claim_number: string | null
          status: Database["public"]["Enums"]["claim_status"]
          symptom_start_date: string | null
          total_cost: number
          treatment: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cause?: string | null
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          diagnosis: string
          first_attention_date?: string | null
          form_data?: Json | null
          id?: string
          incident_date: string
          is_initial_claim?: boolean | null
          notes?: string | null
          policy_id: string
          prior_claim_number?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          symptom_start_date?: string | null
          total_cost: number
          treatment: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cause?: string | null
          claim_type?: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          diagnosis?: string
          first_attention_date?: string | null
          form_data?: Json | null
          id?: string
          incident_date?: string
          is_initial_claim?: boolean | null
          notes?: string | null
          policy_id?: string
          prior_claim_number?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          symptom_start_date?: string | null
          total_cost?: number
          treatment?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      especialidades: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      estudio_items: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string | null
          estudio_id: string
          id: string
          indicacion: string | null
          orden: number
          prioridad: Database["public"]["Enums"]["estudio_prioridad"]
          tipo_estudio: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          descripcion?: string | null
          estudio_id: string
          id?: string
          indicacion?: string | null
          orden?: number
          prioridad?: Database["public"]["Enums"]["estudio_prioridad"]
          tipo_estudio: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string | null
          estudio_id?: string
          id?: string
          indicacion?: string | null
          orden?: number
          prioridad?: Database["public"]["Enums"]["estudio_prioridad"]
          tipo_estudio?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudio_items_estudio_id_fkey"
            columns: ["estudio_id"]
            isOneToOne: false
            referencedRelation: "estudios_solicitados"
            referencedColumns: ["id"]
          },
        ]
      }
      estudios_solicitados: {
        Row: {
          appointment_id: string | null
          ayuno_obligatorio: boolean
          cantidad: number
          created_at: string
          created_by: string
          descripcion: string | null
          doctor_id: string
          estado: Database["public"]["Enums"]["estudio_estado"]
          horas_ayuno: number | null
          id: string
          indicacion: string | null
          laboratorio_sugerido: string | null
          observaciones: string | null
          patient_id: string
          preparacion: string | null
          prioridad: Database["public"]["Enums"]["estudio_prioridad"]
          tipo_estudio: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          ayuno_obligatorio?: boolean
          cantidad?: number
          created_at?: string
          created_by: string
          descripcion?: string | null
          doctor_id: string
          estado?: Database["public"]["Enums"]["estudio_estado"]
          horas_ayuno?: number | null
          id?: string
          indicacion?: string | null
          laboratorio_sugerido?: string | null
          observaciones?: string | null
          patient_id: string
          preparacion?: string | null
          prioridad?: Database["public"]["Enums"]["estudio_prioridad"]
          tipo_estudio?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          ayuno_obligatorio?: boolean
          cantidad?: number
          created_at?: string
          created_by?: string
          descripcion?: string | null
          doctor_id?: string
          estado?: Database["public"]["Enums"]["estudio_estado"]
          horas_ayuno?: number | null
          id?: string
          indicacion?: string | null
          laboratorio_sugerido?: string | null
          observaciones?: string | null
          patient_id?: string
          preparacion?: string | null
          prioridad?: Database["public"]["Enums"]["estudio_prioridad"]
          tipo_estudio?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      firmas_usuario: {
        Row: {
          created_at: string
          es_predeterminada: boolean
          id: string
          imagen_base64: string
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          es_predeterminada?: boolean
          id?: string
          imagen_base64: string
          nombre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          es_predeterminada?: boolean
          id?: string
          imagen_base64?: string
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      formularios: {
        Row: {
          activo: boolean
          aseguradora_id: string
          created_at: string
          es_informe_medico: boolean
          id: string
          nombre: string
          nombre_display: string
          storage_path: string
          total_campos_estimado: number
          total_paginas: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          aseguradora_id: string
          created_at?: string
          es_informe_medico?: boolean
          id?: string
          nombre: string
          nombre_display: string
          storage_path: string
          total_campos_estimado?: number
          total_paginas?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          aseguradora_id?: string
          created_at?: string
          es_informe_medico?: boolean
          id?: string
          nombre?: string
          nombre_display?: string
          storage_path?: string
          total_campos_estimado?: number
          total_paginas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formularios_aseguradora_id_fkey"
            columns: ["aseguradora_id"]
            isOneToOne: false
            referencedRelation: "aseguradoras"
            referencedColumns: ["id"]
          },
        ]
      }
      indicadores_estudio: {
        Row: {
          codigo_indicador: string | null
          created_at: string
          es_normal: boolean | null
          flagged: boolean
          id: string
          nombre_indicador: string
          patient_id: string
          resultado_id: string
          unidad: string | null
          valor: number | null
          valor_referencia_max: number | null
          valor_referencia_min: number | null
        }
        Insert: {
          codigo_indicador?: string | null
          created_at?: string
          es_normal?: boolean | null
          flagged?: boolean
          id?: string
          nombre_indicador: string
          patient_id: string
          resultado_id: string
          unidad?: string | null
          valor?: number | null
          valor_referencia_max?: number | null
          valor_referencia_min?: number | null
        }
        Update: {
          codigo_indicador?: string | null
          created_at?: string
          es_normal?: boolean | null
          flagged?: boolean
          id?: string
          nombre_indicador?: string
          patient_id?: string
          resultado_id?: string
          unidad?: string | null
          valor?: number | null
          valor_referencia_max?: number | null
          valor_referencia_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_estudio_resultado_id_fkey"
            columns: ["resultado_id"]
            isOneToOne: false
            referencedRelation: "resultados_estudios"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policies: {
        Row: {
          agente_clave: string | null
          agente_estado: string | null
          agente_nombre: string | null
          agente_telefono: string | null
          coaseguro_porcentaje: number | null
          company: string
          contractor_name: string | null
          created_at: string
          deducible: number | null
          end_date: string | null
          id: string
          numero_certificado: string | null
          observaciones: string | null
          policy_number: string
          policy_type: string | null
          start_date: string
          status: Database["public"]["Enums"]["policy_status"]
          suma_asegurada: number | null
          tipo_contratacion: string | null
          titular_auth_contact: boolean | null
          titular_birth_country: string | null
          titular_birth_state: string | null
          titular_cell_phone: string | null
          titular_city: string | null
          titular_country: string | null
          titular_dob: string | null
          titular_email: string | null
          titular_ext_number: string | null
          titular_first_name: string | null
          titular_int_number: string | null
          titular_intl_prefix: string | null
          titular_landline: string | null
          titular_maternal_surname: string | null
          titular_municipality: string | null
          titular_nationality: string | null
          titular_neighborhood: string | null
          titular_occupation: string | null
          titular_paternal_surname: string | null
          titular_postal_code: string | null
          titular_rfc: string | null
          titular_state: string | null
          titular_street: string | null
          tope_coaseguro: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agente_clave?: string | null
          agente_estado?: string | null
          agente_nombre?: string | null
          agente_telefono?: string | null
          coaseguro_porcentaje?: number | null
          company?: string
          contractor_name?: string | null
          created_at?: string
          deducible?: number | null
          end_date?: string | null
          id?: string
          numero_certificado?: string | null
          observaciones?: string | null
          policy_number: string
          policy_type?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["policy_status"]
          suma_asegurada?: number | null
          tipo_contratacion?: string | null
          titular_auth_contact?: boolean | null
          titular_birth_country?: string | null
          titular_birth_state?: string | null
          titular_cell_phone?: string | null
          titular_city?: string | null
          titular_country?: string | null
          titular_dob?: string | null
          titular_email?: string | null
          titular_ext_number?: string | null
          titular_first_name?: string | null
          titular_int_number?: string | null
          titular_intl_prefix?: string | null
          titular_landline?: string | null
          titular_maternal_surname?: string | null
          titular_municipality?: string | null
          titular_nationality?: string | null
          titular_neighborhood?: string | null
          titular_occupation?: string | null
          titular_paternal_surname?: string | null
          titular_postal_code?: string | null
          titular_rfc?: string | null
          titular_state?: string | null
          titular_street?: string | null
          tope_coaseguro?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agente_clave?: string | null
          agente_estado?: string | null
          agente_nombre?: string | null
          agente_telefono?: string | null
          coaseguro_porcentaje?: number | null
          company?: string
          contractor_name?: string | null
          created_at?: string
          deducible?: number | null
          end_date?: string | null
          id?: string
          numero_certificado?: string | null
          observaciones?: string | null
          policy_number?: string
          policy_type?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["policy_status"]
          suma_asegurada?: number | null
          tipo_contratacion?: string | null
          titular_auth_contact?: boolean | null
          titular_birth_country?: string | null
          titular_birth_state?: string | null
          titular_cell_phone?: string | null
          titular_city?: string | null
          titular_country?: string | null
          titular_dob?: string | null
          titular_email?: string | null
          titular_ext_number?: string | null
          titular_first_name?: string | null
          titular_int_number?: string | null
          titular_intl_prefix?: string | null
          titular_landline?: string | null
          titular_maternal_surname?: string | null
          titular_municipality?: string | null
          titular_nationality?: string | null
          titular_neighborhood?: string | null
          titular_occupation?: string | null
          titular_paternal_surname?: string | null
          titular_postal_code?: string | null
          titular_rfc?: string | null
          titular_state?: string | null
          titular_street?: string | null
          tope_coaseguro?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mapeo_medicos: {
        Row: {
          columna_origen: string
          id: string
          nombre_display: string
          tipo: string
        }
        Insert: {
          columna_origen: string
          id: string
          nombre_display: string
          tipo?: string
        }
        Update: {
          columna_origen?: string
          id?: string
          nombre_display?: string
          tipo?: string
        }
        Relationships: []
      }
      mapeo_perfiles: {
        Row: {
          columna_origen: string
          id: string
          nombre_display: string
          tipo: string
        }
        Insert: {
          columna_origen: string
          id: string
          nombre_display: string
          tipo?: string
        }
        Update: {
          columna_origen?: string
          id?: string
          nombre_display?: string
          tipo?: string
        }
        Relationships: []
      }
      mapeo_polizas: {
        Row: {
          columna_origen: string
          id: string
          nombre_display: string
          tipo: string
        }
        Insert: {
          columna_origen: string
          id: string
          nombre_display: string
          tipo?: string
        }
        Update: {
          columna_origen?: string
          id?: string
          nombre_display?: string
          tipo?: string
        }
        Relationships: []
      }
      mapeo_siniestros: {
        Row: {
          columna_origen: string
          id: string
          nombre_display: string
          tipo: string
        }
        Insert: {
          columna_origen: string
          id: string
          nombre_display: string
          tipo?: string
        }
        Update: {
          columna_origen?: string
          id?: string
          nombre_display?: string
          tipo?: string
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          created_at: string
          description: string | null
          file_path: string
          id: string
          record_date: string
          record_type: Database["public"]["Enums"]["medical_record_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path: string
          id?: string
          record_date?: string
          record_type: Database["public"]["Enums"]["medical_record_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string
          id?: string
          record_date?: string
          record_type?: Database["public"]["Enums"]["medical_record_type"]
          user_id?: string
        }
        Relationships: []
      }
      medication_schedule: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          interval_hours: number
          last_dose_at: string | null
          medication_id: string
          next_dose_at: string
          receta_item_id: string | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          interval_hours: number
          last_dose_at?: string | null
          medication_id: string
          next_dose_at: string
          receta_item_id?: string | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          interval_hours?: number
          last_dose_at?: string | null
          medication_id?: string
          next_dose_at?: string
          receta_item_id?: string | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_schedule_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          created_at: string
          dosage: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["medication_frequency"]
          frequency_hours: number | null
          id: string
          name: string
          receta_item_id: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          dosage: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["medication_frequency"]
          frequency_hours?: number | null
          id?: string
          name: string
          receta_item_id?: string | null
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          dosage?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["medication_frequency"]
          frequency_hours?: number | null
          id?: string
          name?: string
          receta_item_id?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medico_documentos: {
        Row: {
          created_at: string
          especialidad_id: string | null
          file_name: string
          file_path: string
          id: string
          medico_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          especialidad_id?: string | null
          file_name?: string
          file_path: string
          id?: string
          medico_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          especialidad_id?: string | null
          file_name?: string
          file_path?: string
          id?: string
          medico_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_documentos_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_documentos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_especialidades: {
        Row: {
          cedula_especialidad: string | null
          created_at: string
          especialidad_id: string
          id: string
          medico_id: string
        }
        Insert: {
          cedula_especialidad?: string | null
          created_at?: string
          especialidad_id: string
          id?: string
          medico_id: string
        }
        Update: {
          cedula_especialidad?: string | null
          created_at?: string
          especialidad_id?: string
          id?: string
          medico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_especialidades_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_especialidades_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          cedula_general: string | null
          consultorio_calle: string | null
          consultorio_colonia: string | null
          consultorio_cp: string | null
          consultorio_estado: string | null
          consultorio_municipio: string | null
          consultorio_numero: string | null
          created_at: string
          direccion_consultorio: string | null
          email_consultorio: string | null
          foto_path: string | null
          horario_atencion: string | null
          id: string
          nombre_consultorio: string | null
          telefono_consultorio: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cedula_general?: string | null
          consultorio_calle?: string | null
          consultorio_colonia?: string | null
          consultorio_cp?: string | null
          consultorio_estado?: string | null
          consultorio_municipio?: string | null
          consultorio_numero?: string | null
          created_at?: string
          direccion_consultorio?: string | null
          email_consultorio?: string | null
          foto_path?: string | null
          horario_atencion?: string | null
          id?: string
          nombre_consultorio?: string | null
          telefono_consultorio?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cedula_general?: string | null
          consultorio_calle?: string | null
          consultorio_colonia?: string | null
          consultorio_cp?: string | null
          consultorio_estado?: string | null
          consultorio_municipio?: string | null
          consultorio_numero?: string | null
          created_at?: string
          direccion_consultorio?: string | null
          email_consultorio?: string | null
          foto_path?: string | null
          horario_atencion?: string | null
          id?: string
          nombre_consultorio?: string | null
          telefono_consultorio?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_personnel: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          notes: string | null
          patient_id: string
          personnel_id: string
          personnel_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          notes?: string | null
          patient_id: string
          personnel_id: string
          personnel_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          notes?: string | null
          patient_id?: string
          personnel_id?: string
          personnel_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          birth_country: string | null
          birth_state: string | null
          cargo_pep: string | null
          certificate_number: string | null
          country: string | null
          created_at: string
          curp: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          es_pep: boolean | null
          estado_civil: string | null
          first_name: string
          full_name: string
          giro_negocio: string | null
          id: string
          interior_number: string | null
          maternal_surname: string
          municipality: string | null
          nationality: string | null
          neighborhood: string | null
          numero_identificacion: string | null
          occupation: string | null
          paternal_surname: string
          phone: string | null
          postal_code: string | null
          relationship_to_titular: string | null
          rfc: string | null
          sex: string | null
          state: string | null
          street: string | null
          street_number: string | null
          telefono_celular: string | null
          tipo_identificacion: string | null
          updated_at: string
          user_id: string
          vigencia_identificacion: string | null
        }
        Insert: {
          address?: string | null
          birth_country?: string | null
          birth_state?: string | null
          cargo_pep?: string | null
          certificate_number?: string | null
          country?: string | null
          created_at?: string
          curp?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          es_pep?: boolean | null
          estado_civil?: string | null
          first_name?: string
          full_name?: string
          giro_negocio?: string | null
          id?: string
          interior_number?: string | null
          maternal_surname?: string
          municipality?: string | null
          nationality?: string | null
          neighborhood?: string | null
          numero_identificacion?: string | null
          occupation?: string | null
          paternal_surname?: string
          phone?: string | null
          postal_code?: string | null
          relationship_to_titular?: string | null
          rfc?: string | null
          sex?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          telefono_celular?: string | null
          tipo_identificacion?: string | null
          updated_at?: string
          user_id: string
          vigencia_identificacion?: string | null
        }
        Update: {
          address?: string | null
          birth_country?: string | null
          birth_state?: string | null
          cargo_pep?: string | null
          certificate_number?: string | null
          country?: string | null
          created_at?: string
          curp?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          es_pep?: boolean | null
          estado_civil?: string | null
          first_name?: string
          full_name?: string
          giro_negocio?: string | null
          id?: string
          interior_number?: string | null
          maternal_surname?: string
          municipality?: string | null
          nationality?: string | null
          neighborhood?: string | null
          numero_identificacion?: string | null
          occupation?: string | null
          paternal_surname?: string
          phone?: string | null
          postal_code?: string | null
          relationship_to_titular?: string | null
          rfc?: string | null
          sex?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          telefono_celular?: string | null
          tipo_identificacion?: string | null
          updated_at?: string
          user_id?: string
          vigencia_identificacion?: string | null
        }
        Relationships: []
      }
      receta_items: {
        Row: {
          cantidad: number | null
          created_at: string
          dias_a_tomar: number | null
          dosis: number | null
          es_generico: boolean
          frecuencia: Database["public"]["Enums"]["receta_frecuencia"]
          frecuencia_horas: number | null
          id: string
          indicacion: string | null
          marca_comercial: string | null
          medicamento_nombre: string
          orden: number
          precio_aproximado: number | null
          receta_id: string
          unidad_dosis: string | null
          via_administracion: string | null
        }
        Insert: {
          cantidad?: number | null
          created_at?: string
          dias_a_tomar?: number | null
          dosis?: number | null
          es_generico?: boolean
          frecuencia?: Database["public"]["Enums"]["receta_frecuencia"]
          frecuencia_horas?: number | null
          id?: string
          indicacion?: string | null
          marca_comercial?: string | null
          medicamento_nombre: string
          orden?: number
          precio_aproximado?: number | null
          receta_id: string
          unidad_dosis?: string | null
          via_administracion?: string | null
        }
        Update: {
          cantidad?: number | null
          created_at?: string
          dias_a_tomar?: number | null
          dosis?: number | null
          es_generico?: boolean
          frecuencia?: Database["public"]["Enums"]["receta_frecuencia"]
          frecuencia_horas?: number | null
          id?: string
          indicacion?: string | null
          marca_comercial?: string | null
          medicamento_nombre?: string
          orden?: number
          precio_aproximado?: number | null
          receta_id?: string
          unidad_dosis?: string | null
          via_administracion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receta_items_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
        ]
      }
      recetas: {
        Row: {
          appointment_id: string | null
          cantidad: number | null
          created_at: string
          created_by: string
          dias_a_tomar: number | null
          doctor_id: string
          dosis: number | null
          es_generico: boolean
          estado: Database["public"]["Enums"]["receta_estado"]
          frecuencia: Database["public"]["Enums"]["receta_frecuencia"]
          frecuencia_horas: number | null
          id: string
          indicacion: string | null
          marca_comercial: string | null
          medicamento_nombre: string | null
          observaciones: string | null
          patient_id: string
          precio_aproximado: number | null
          unidad_dosis: string | null
          updated_at: string
          via_administracion: string | null
        }
        Insert: {
          appointment_id?: string | null
          cantidad?: number | null
          created_at?: string
          created_by: string
          dias_a_tomar?: number | null
          doctor_id: string
          dosis?: number | null
          es_generico?: boolean
          estado?: Database["public"]["Enums"]["receta_estado"]
          frecuencia?: Database["public"]["Enums"]["receta_frecuencia"]
          frecuencia_horas?: number | null
          id?: string
          indicacion?: string | null
          marca_comercial?: string | null
          medicamento_nombre?: string | null
          observaciones?: string | null
          patient_id: string
          precio_aproximado?: number | null
          unidad_dosis?: string | null
          updated_at?: string
          via_administracion?: string | null
        }
        Update: {
          appointment_id?: string | null
          cantidad?: number | null
          created_at?: string
          created_by?: string
          dias_a_tomar?: number | null
          doctor_id?: string
          dosis?: number | null
          es_generico?: boolean
          estado?: Database["public"]["Enums"]["receta_estado"]
          frecuencia?: Database["public"]["Enums"]["receta_frecuencia"]
          frecuencia_horas?: number | null
          id?: string
          indicacion?: string | null
          marca_comercial?: string | null
          medicamento_nombre?: string | null
          observaciones?: string | null
          patient_id?: string
          precio_aproximado?: number | null
          unidad_dosis?: string | null
          updated_at?: string
          via_administracion?: string | null
        }
        Relationships: []
      }
      resultados_estudios: {
        Row: {
          created_at: string
          estudio_id: string
          fecha_resultado: string | null
          id: string
          laboratorio_nombre: string | null
          notas: string | null
          patient_id: string
          pdf_name: string
          pdf_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          estudio_id: string
          fecha_resultado?: string | null
          id?: string
          laboratorio_nombre?: string | null
          notas?: string | null
          patient_id: string
          pdf_name?: string
          pdf_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          estudio_id?: string
          fecha_resultado?: string | null
          id?: string
          laboratorio_nombre?: string | null
          notas?: string | null
          patient_id?: string
          pdf_name?: string
          pdf_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "resultados_estudios_estudio_id_fkey"
            columns: ["estudio_id"]
            isOneToOne: false
            referencedRelation: "estudios_solicitados"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean
          feature_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          feature_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          feature_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      secciones: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          nombre: string
          orden: number
          pagina: number
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          nombre: string
          orden?: number
          pagina?: number
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          nombre?: string
          orden?: number
          pagina?: number
        }
        Relationships: [
          {
            foreignKeyName: "secciones_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_folio: { Args: { _code: string; _insurer: string }; Returns: string }
      has_patient_access: {
        Args: { _patient: string; _personnel: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "broker"
        | "paciente"
        | "medico"
        | "enfermero"
        | "laboratorio"
        | "farmacia"
      appointment_document_category:
        | "receta"
        | "estudio"
        | "notas_medicas"
        | "cfdi"
        | "impresion_cfdi"
        | "otro"
      appointment_type: "consulta" | "estudio" | "procedimiento"
      claim_status: "pendiente" | "aprobado" | "rechazado" | "en_revision"
      claim_type: "reembolso" | "procedimiento_programado"
      estudio_estado: "solicitado" | "en_proceso" | "completado" | "cancelado"
      estudio_prioridad: "baja" | "normal" | "urgente"
      medical_record_type: "receta" | "laboratorio" | "documento"
      medication_frequency:
        | "diario"
        | "cada_8_horas"
        | "cada_12_horas"
        | "cada_24_horas"
        | "semanal"
        | "cada_4_horas"
        | "cada_6_horas"
        | "cada_48_horas"
        | "personalizado"
      policy_status: "activa" | "inactiva"
      receta_estado: "activa" | "completada" | "cancelada"
      receta_frecuencia:
        | "cada_4h"
        | "cada_6h"
        | "cada_8h"
        | "cada_12h"
        | "cada_24h"
        | "cada_48h"
        | "semanal"
        | "otro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "broker",
        "paciente",
        "medico",
        "enfermero",
        "laboratorio",
        "farmacia",
      ],
      appointment_document_category: [
        "receta",
        "estudio",
        "notas_medicas",
        "cfdi",
        "impresion_cfdi",
        "otro",
      ],
      appointment_type: ["consulta", "estudio", "procedimiento"],
      claim_status: ["pendiente", "aprobado", "rechazado", "en_revision"],
      claim_type: ["reembolso", "procedimiento_programado"],
      estudio_estado: ["solicitado", "en_proceso", "completado", "cancelado"],
      estudio_prioridad: ["baja", "normal", "urgente"],
      medical_record_type: ["receta", "laboratorio", "documento"],
      medication_frequency: [
        "diario",
        "cada_8_horas",
        "cada_12_horas",
        "cada_24_horas",
        "semanal",
        "cada_4_horas",
        "cada_6_horas",
        "cada_48_horas",
        "personalizado",
      ],
      policy_status: ["activa", "inactiva"],
      receta_estado: ["activa", "completada", "cancelada"],
      receta_frecuencia: [
        "cada_4h",
        "cada_6h",
        "cada_8h",
        "cada_12h",
        "cada_24h",
        "cada_48h",
        "semanal",
        "otro",
      ],
    },
  },
} as const

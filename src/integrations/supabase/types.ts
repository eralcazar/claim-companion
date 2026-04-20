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
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          created_at: string
          doctor_id: string | null
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
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
      claim_documents: {
        Row: {
          claim_id: string
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
        }
        Insert: {
          claim_id: string
          created_at?: string
          file_name?: string
          file_path: string
          file_type?: string
          id?: string
        }
        Update: {
          claim_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
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
      medications: {
        Row: {
          active: boolean
          created_at: string
          dosage: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["medication_frequency"]
          id: string
          name: string
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
          id?: string
          name: string
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
          id?: string
          name?: string
          start_date?: string
          updated_at?: string
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "broker" | "paciente" | "medico"
      appointment_type: "consulta" | "estudio" | "procedimiento"
      claim_status: "pendiente" | "aprobado" | "rechazado" | "en_revision"
      claim_type: "reembolso" | "procedimiento_programado"
      medical_record_type: "receta" | "laboratorio" | "documento"
      medication_frequency:
        | "diario"
        | "cada_8_horas"
        | "cada_12_horas"
        | "cada_24_horas"
        | "semanal"
      policy_status: "activa" | "inactiva"
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
      app_role: ["admin", "broker", "paciente", "medico"],
      appointment_type: ["consulta", "estudio", "procedimiento"],
      claim_status: ["pendiente", "aprobado", "rechazado", "en_revision"],
      claim_type: ["reembolso", "procedimiento_programado"],
      medical_record_type: ["receta", "laboratorio", "documento"],
      medication_frequency: [
        "diario",
        "cada_8_horas",
        "cada_12_horas",
        "cada_24_horas",
        "semanal",
      ],
      policy_status: ["activa", "inactiva"],
    },
  },
} as const

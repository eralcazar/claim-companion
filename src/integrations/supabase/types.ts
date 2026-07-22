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
      activity_ai_suggestions: {
        Row: {
          applied_plan_id: string | null
          created_at: string
          id: string
          model: string | null
          patient_id: string
          recommendations: Json | null
          red_flags: Json | null
          suggested_plan: Json | null
          summary: string | null
          tokens_used: number | null
        }
        Insert: {
          applied_plan_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          patient_id: string
          recommendations?: Json | null
          red_flags?: Json | null
          suggested_plan?: Json | null
          summary?: string | null
          tokens_used?: number | null
        }
        Update: {
          applied_plan_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          patient_id?: string
          recommendations?: Json | null
          red_flags?: Json | null
          suggested_plan?: Json | null
          summary?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_ai_suggestions_applied_plan_id_fkey"
            columns: ["applied_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_goals: {
        Row: {
          active_minutes_goal: number
          calories_goal: number
          created_at: string
          id: string
          max_hr: number | null
          patient_id: string
          resting_hr: number | null
          sleep_minutes_goal: number
          steps_goal: number
          updated_at: string
        }
        Insert: {
          active_minutes_goal?: number
          calories_goal?: number
          created_at?: string
          id?: string
          max_hr?: number | null
          patient_id: string
          resting_hr?: number | null
          sleep_minutes_goal?: number
          steps_goal?: number
          updated_at?: string
        }
        Update: {
          active_minutes_goal?: number
          calories_goal?: number
          created_at?: string
          id?: string
          max_hr?: number | null
          patient_id?: string
          resting_hr?: number | null
          sleep_minutes_goal?: number
          steps_goal?: number
          updated_at?: string
        }
        Relationships: []
      }
      activity_readings: {
        Row: {
          active_minutes: number | null
          calories: number | null
          created_at: string
          device_name: string | null
          external_uuid: string | null
          fecha: string
          id: string
          patient_id: string
          requires_review: boolean
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sleep_minutes: number | null
          source: string | null
          steps: number | null
          updated_at: string
        }
        Insert: {
          active_minutes?: number | null
          calories?: number | null
          created_at?: string
          device_name?: string | null
          external_uuid?: string | null
          fecha: string
          id?: string
          patient_id: string
          requires_review?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sleep_minutes?: number | null
          source?: string | null
          steps?: number | null
          updated_at?: string
        }
        Update: {
          active_minutes?: number | null
          calories?: number | null
          created_at?: string
          device_name?: string | null
          external_uuid?: string | null
          fecha?: string
          id?: string
          patient_id?: string
          requires_review?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sleep_minutes?: number | null
          source?: string | null
          steps?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_api_key_audit: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          length: number | null
          model_used: string | null
          note: string | null
          preview: string | null
          secret_name: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          length?: number | null
          model_used?: string | null
          note?: string | null
          preview?: string | null
          secret_name: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          length?: number | null
          model_used?: string | null
          note?: string | null
          preview?: string | null
          secret_name?: string
        }
        Relationships: []
      }
      ai_chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tokens_used: number
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tokens_used?: number
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tokens_used?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_external_providers: {
        Row: {
          activo: boolean
          aviso_legal: string
          created_at: string
          default_model: string | null
          docs_url: string | null
          endpoint: string
          id: string
          legal_version: string
          models: Json
          nombre: string
          requires_api_key: boolean
          secret_name: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          aviso_legal: string
          created_at?: string
          default_model?: string | null
          docs_url?: string | null
          endpoint: string
          id: string
          legal_version?: string
          models?: Json
          nombre: string
          requires_api_key?: boolean
          secret_name?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          aviso_legal?: string
          created_at?: string
          default_model?: string | null
          docs_url?: string | null
          endpoint?: string
          id?: string
          legal_version?: string
          models?: Json
          nombre?: string
          requires_api_key?: boolean
          secret_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_feature_consents: {
        Row: {
          created_at: string
          feature_key: string
          granted: boolean
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          granted?: boolean
          id?: string
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          granted?: boolean
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_provider_audit: {
        Row: {
          blocked_reason: string | null
          consent_checked: boolean
          created_at: string
          fallback_used: boolean
          feature_key: string
          id: string
          input_chars: number | null
          latency_ms: number | null
          model: string | null
          output_chars: number | null
          pii_fields_detected: Json
          provider: string
          sanitization_notes: string | null
          sanitized: boolean
          sanitized_prompt: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          blocked_reason?: string | null
          consent_checked?: boolean
          created_at?: string
          fallback_used?: boolean
          feature_key: string
          id?: string
          input_chars?: number | null
          latency_ms?: number | null
          model?: string | null
          output_chars?: number | null
          pii_fields_detected?: Json
          provider?: string
          sanitization_notes?: string | null
          sanitized?: boolean
          sanitized_prompt?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          blocked_reason?: string | null
          consent_checked?: boolean
          created_at?: string
          fallback_used?: boolean
          feature_key?: string
          id?: string
          input_chars?: number | null
          latency_ms?: number | null
          model?: string | null
          output_chars?: number | null
          pii_fields_detected?: Json
          provider?: string
          sanitization_notes?: string | null
          sanitized?: boolean
          sanitized_prompt?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_provider_policy: {
        Row: {
          cache_ttl_hours: number
          created_at: string
          enable_cache: boolean
          external_endpoint: string | null
          feature_key: string
          history_window: number
          id: string
          label: string
          max_input_tokens: number
          max_output_tokens: number
          model: string
          notes: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          cache_ttl_hours?: number
          created_at?: string
          enable_cache?: boolean
          external_endpoint?: string | null
          feature_key: string
          history_window?: number
          id?: string
          label: string
          max_input_tokens?: number
          max_output_tokens?: number
          model?: string
          notes?: string | null
          provider?: string
          updated_at?: string
        }
        Update: {
          cache_ttl_hours?: number
          created_at?: string
          enable_cache?: boolean
          external_endpoint?: string | null
          feature_key?: string
          history_window?: number
          id?: string
          label?: string
          max_input_tokens?: number
          max_output_tokens?: number
          model?: string
          notes?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_response_cache: {
        Row: {
          created_at: string
          expires_at: string
          feature_key: string
          hit_count: number
          id: string
          last_hit_at: string | null
          model: string
          prompt_hash: string
          prompt_normalized: string
          response: string
          tokens_saved: number
        }
        Insert: {
          created_at?: string
          expires_at?: string
          feature_key: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          model: string
          prompt_hash: string
          prompt_normalized: string
          response: string
          tokens_saved?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          feature_key?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          model?: string
          prompt_hash?: string
          prompt_normalized?: string
          response?: string
          tokens_saved?: number
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      ai_token_balances: {
        Row: {
          balance: number
          lifetime_consumed: number
          lifetime_granted: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          lifetime_consumed?: number
          lifetime_granted?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          lifetime_consumed?: number
          lifetime_granted?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_token_monthly_limits: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          monthly_token_cap: number
          plan_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          monthly_token_cap: number
          plan_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          monthly_token_cap?: number
          plan_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_monthly_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_packs: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          moneda: string
          nombre: string
          orden: number
          precio_centavos: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          tokens: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre: string
          orden?: number
          precio_centavos: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tokens: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre?: string
          orden?: number
          precio_centavos?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tokens?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_token_purchases: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          id: string
          pack_id: string | null
          status: string
          stripe_session_id: string | null
          tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          pack_id?: string | null
          status?: string
          stripe_session_id?: string | null
          tokens: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          pack_id?: string | null
          status?: string
          stripe_session_id?: string | null
          tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "ai_token_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_token_usage_log: {
        Row: {
          completion_tokens: number
          conversation_id: string | null
          cost_usd_micros: number
          created_at: string
          fallback_used: boolean
          id: string
          message_id: string | null
          model: string | null
          prompt_tokens: number
          provider: string
          sanitized: boolean
          total_tokens: number
          user_id: string
        }
        Insert: {
          completion_tokens?: number
          conversation_id?: string | null
          cost_usd_micros?: number
          created_at?: string
          fallback_used?: boolean
          id?: string
          message_id?: string | null
          model?: string | null
          prompt_tokens?: number
          provider?: string
          sanitized?: boolean
          total_tokens?: number
          user_id: string
        }
        Update: {
          completion_tokens?: number
          conversation_id?: string | null
          cost_usd_micros?: number
          created_at?: string
          fallback_used?: boolean
          id?: string
          message_id?: string | null
          model?: string | null
          prompt_tokens?: number
          provider?: string
          sanitized?: boolean
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
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
      appointment_reviews: {
        Row: {
          appointment_id: string
          claridad: number | null
          comentario: string | null
          created_at: string
          id: string
          patient_id: string
          professional_id: string
          publicada: boolean
          puntualidad: number | null
          rating: number
          reportada: boolean
          respuesta_at: string | null
          respuesta_profesional: string | null
          trato: number | null
          updated_at: string
          verificada: boolean
        }
        Insert: {
          appointment_id: string
          claridad?: number | null
          comentario?: string | null
          created_at?: string
          id?: string
          patient_id: string
          professional_id: string
          publicada?: boolean
          puntualidad?: number | null
          rating: number
          reportada?: boolean
          respuesta_at?: string | null
          respuesta_profesional?: string | null
          trato?: number | null
          updated_at?: string
          verificada?: boolean
        }
        Update: {
          appointment_id?: string
          claridad?: number | null
          comentario?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          professional_id?: string
          publicada?: boolean
          puntualidad?: number | null
          rating?: number
          reportada?: boolean
          respuesta_at?: string | null
          respuesta_profesional?: string | null
          trato?: number | null
          updated_at?: string
          verificada?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
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
          is_telemedicine: boolean
          meeting_url: string | null
          notes: string | null
          reminder_1h_sent_at: string | null
          reminder_24h_sent_at: string | null
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
          is_telemedicine?: boolean
          meeting_url?: string | null
          notes?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
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
          is_telemedicine?: boolean
          meeting_url?: string | null
          notes?: string | null
          reminder_1h_sent_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_enabled?: boolean
          reminder_minutes_before?: number | null
          reminder_sent_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      arco_requests: {
        Row: {
          admin_notes: string | null
          contact_email: string
          contact_phone: string | null
          created_at: string
          description: string
          id: string
          identity_document_path: string | null
          request_type: string
          responded_at: string | null
          responded_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          description: string
          id?: string
          identity_document_path?: string | null
          request_type: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          description?: string
          id?: string
          identity_document_path?: string | null
          request_type?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          at: string
          before: Json | null
          id: string
          patient_id: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          id?: string
          patient_id?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          id?: string
          patient_id?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      ble_connection_errors: {
        Row: {
          browser_ua: string | null
          created_at: string
          error_code: string | null
          error_message: string
          external_uuid: string | null
          id: string
          patient_id: string
          service_type: string | null
        }
        Insert: {
          browser_ua?: string | null
          created_at?: string
          error_code?: string | null
          error_message: string
          external_uuid?: string | null
          id?: string
          patient_id: string
          service_type?: string | null
        }
        Update: {
          browser_ua?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string
          external_uuid?: string | null
          id?: string
          patient_id?: string
          service_type?: string | null
        }
        Relationships: []
      }
      ble_known_devices: {
        Row: {
          blocked: boolean
          brand: string | null
          created_at: string
          id: string
          measurement_types: string[]
          model: string | null
          name_pattern: string
          notes: string | null
          service_uuid: string
          updated_at: string
          vendor: string | null
          verified: boolean
        }
        Insert: {
          blocked?: boolean
          brand?: string | null
          created_at?: string
          id?: string
          measurement_types?: string[]
          model?: string | null
          name_pattern: string
          notes?: string | null
          service_uuid: string
          updated_at?: string
          vendor?: string | null
          verified?: boolean
        }
        Update: {
          blocked?: boolean
          brand?: string | null
          created_at?: string
          id?: string
          measurement_types?: string[]
          model?: string | null
          name_pattern?: string
          notes?: string | null
          service_uuid?: string
          updated_at?: string
          vendor?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      ble_test_settings: {
        Row: {
          created_at: string
          max_retries: number
          read_timeout_ms: number
          retry_delay_ms: number
          scan_timeout_ms: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          max_retries?: number
          read_timeout_ms?: number
          retry_delay_ms?: number
          scan_timeout_ms?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          max_retries?: number
          read_timeout_ms?: number
          retry_delay_ms?: number
          scan_timeout_ms?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      blood_pressure_readings: {
        Row: {
          arm: string | null
          created_at: string
          created_by: string
          device_name: string | null
          diastolic: number
          external_uuid: string | null
          id: string
          notes: string | null
          patient_id: string
          position: string | null
          pulse: number | null
          requires_review: boolean
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          systolic: number
          taken_at: string
          updated_at: string
        }
        Insert: {
          arm?: string | null
          created_at?: string
          created_by: string
          device_name?: string | null
          diastolic: number
          external_uuid?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          position?: string | null
          pulse?: number | null
          requires_review?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          systolic: number
          taken_at?: string
          updated_at?: string
        }
        Update: {
          arm?: string | null
          created_at?: string
          created_by?: string
          device_name?: string | null
          diastolic?: number
          external_uuid?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          position?: string | null
          pulse?: number | null
          requires_review?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          systolic?: number
          taken_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      body_annotation_files: {
        Row: {
          annotation_id: string
          created_at: string
          file_name: string
          file_path: string
          file_type: string
          id: string
          uploaded_by: string
        }
        Insert: {
          annotation_id: string
          created_at?: string
          file_name?: string
          file_path: string
          file_type?: string
          id?: string
          uploaded_by: string
        }
        Update: {
          annotation_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_annotation_files_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "body_annotations"
            referencedColumns: ["id"]
          },
        ]
      }
      body_annotations: {
        Row: {
          appointment_id: string | null
          body_part: string
          body_view: string
          created_at: string
          created_by: string
          id: string
          is_vigente: boolean
          marker_x: number
          marker_y: number
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          moderation_status: string
          note: string | null
          patient_id: string
          severity: string
          superseded_at: string | null
          superseded_by: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          body_part: string
          body_view?: string
          created_at?: string
          created_by: string
          id?: string
          is_vigente?: boolean
          marker_x?: number
          marker_y?: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          moderation_status?: string
          note?: string | null
          patient_id: string
          severity?: string
          superseded_at?: string | null
          superseded_by?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          body_part?: string
          body_view?: string
          created_at?: string
          created_by?: string
          id?: string
          is_vigente?: boolean
          marker_x?: number
          marker_y?: number
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          moderation_status?: string
          note?: string | null
          patient_id?: string
          severity?: string
          superseded_at?: string | null
          superseded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_annotations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_annotations_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "body_annotations"
            referencedColumns: ["id"]
          },
        ]
      }
      bp_reminder_schedules: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          daily_times: string[] | null
          ends_at: string | null
          id: string
          interval_hours: number | null
          label: string | null
          last_run_at: string | null
          mode: string
          next_run_at: string
          patient_id: string
          starts_at: string
          timezone: string
          updated_at: string
          weekdays: number[] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          daily_times?: string[] | null
          ends_at?: string | null
          id?: string
          interval_hours?: number | null
          label?: string | null
          last_run_at?: string | null
          mode: string
          next_run_at?: string
          patient_id: string
          starts_at?: string
          timezone?: string
          updated_at?: string
          weekdays?: number[] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          daily_times?: string[] | null
          ends_at?: string | null
          id?: string
          interval_hours?: number | null
          label?: string | null
          last_run_at?: string | null
          mode?: string
          next_run_at?: string
          patient_id?: string
          starts_at?: string
          timezone?: string
          updated_at?: string
          weekdays?: number[] | null
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
      cfdi_config: {
        Row: {
          activo: boolean
          branch_id: string | null
          codigo_postal: string
          created_at: string
          csd_cer_path: string | null
          csd_key_path: string | null
          csd_no_certificado: string | null
          csd_password: string | null
          csd_vigencia_desde: string | null
          csd_vigencia_hasta: string | null
          emisor_type: string
          folio_inicial: number
          id: string
          modo: string
          owner_id: string
          pac: string
          razon_social: string
          regimen_fiscal: string
          rfc: string
          serie: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          branch_id?: string | null
          codigo_postal: string
          created_at?: string
          csd_cer_path?: string | null
          csd_key_path?: string | null
          csd_no_certificado?: string | null
          csd_password?: string | null
          csd_vigencia_desde?: string | null
          csd_vigencia_hasta?: string | null
          emisor_type: string
          folio_inicial?: number
          id?: string
          modo?: string
          owner_id: string
          pac?: string
          razon_social: string
          regimen_fiscal?: string
          rfc: string
          serie?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          branch_id?: string | null
          codigo_postal?: string
          created_at?: string
          csd_cer_path?: string | null
          csd_key_path?: string | null
          csd_no_certificado?: string | null
          csd_password?: string | null
          csd_vigencia_desde?: string | null
          csd_vigencia_hasta?: string | null
          emisor_type?: string
          folio_inicial?: number
          id?: string
          modo?: string
          owner_id?: string
          pac?: string
          razon_social?: string
          regimen_fiscal?: string
          rfc?: string
          serie?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfdi_config_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      cfdi_stamps: {
        Row: {
          actor_id: string | null
          created_at: string
          error: string | null
          id: string
          invoice_id: string
          modo: string
          ok: boolean
          pac: string
          pdf_url: string | null
          request_summary: Json | null
          response_summary: Json | null
          uuid_sat: string | null
          xml_url: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          invoice_id: string
          modo: string
          ok: boolean
          pac: string
          pdf_url?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          uuid_sat?: string | null
          xml_url?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          invoice_id?: string
          modo?: string
          ok?: boolean
          pac?: string
          pdf_url?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          uuid_sat?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfdi_stamps_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "medico_invoices"
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
      consents: {
        Row: {
          accepted: boolean
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          patient_id: string
          revoked_at: string | null
          signature_data_url: string | null
          signature_pdf_path: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted?: boolean
          consent_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          patient_id: string
          revoked_at?: string | null
          signature_data_url?: string | null
          signature_pdf_path?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          accepted?: boolean
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          patient_id?: string
          revoked_at?: string | null
          signature_data_url?: string | null
          signature_pdf_path?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      device_test_requests: {
        Row: {
          app_version: string | null
          created_at: string
          device_id: string
          device_name: string
          evidence_path: string | null
          firmware: string | null
          id: string
          note: string | null
          region: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_id: string
          device_name: string
          evidence_path?: string | null
          firmware?: string | null
          id?: string
          note?: string | null
          region?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_id?: string
          device_name?: string
          evidence_path?: string | null
          firmware?: string | null
          id?: string
          note?: string | null
          region?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      especialidad_busquedas: {
        Row: {
          area: string | null
          created_at: string
          id: string
          last_used_at: string
          nombre: string
          nombre_custom: string | null
          only_favs: boolean
          orden: number
          pais: string | null
          pinned: boolean
          q: string | null
          sector: string | null
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: string
          last_used_at?: string
          nombre: string
          nombre_custom?: string | null
          only_favs?: boolean
          orden?: number
          pais?: string | null
          pinned?: boolean
          q?: string | null
          sector?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: string
          last_used_at?: string
          nombre?: string
          nombre_custom?: string | null
          only_favs?: boolean
          orden?: number
          pais?: string | null
          pinned?: boolean
          q?: string | null
          sector?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      especialidad_favoritos: {
        Row: {
          created_at: string
          especialidad_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          especialidad_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          especialidad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "especialidad_favoritos_especialidad_id_fkey"
            columns: ["especialidad_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
        ]
      }
      especialidades: {
        Row: {
          activa: boolean
          area: string | null
          created_at: string
          id: string
          nombre: string
          pais: string
          sector: string | null
        }
        Insert: {
          activa?: boolean
          area?: string | null
          created_at?: string
          id?: string
          nombre: string
          pais?: string
          sector?: string | null
        }
        Update: {
          activa?: boolean
          area?: string | null
          created_at?: string
          id?: string
          nombre?: string
          pais?: string
          sector?: string | null
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
          key_id: string | null
          laboratorio_sugerido: string | null
          observaciones: string | null
          patient_id: string
          payload_hash: string | null
          preparacion: string | null
          prev_hash: string | null
          prioridad: Database["public"]["Enums"]["estudio_prioridad"]
          record_hash: string | null
          signature: string | null
          signed_at: string | null
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
          key_id?: string | null
          laboratorio_sugerido?: string | null
          observaciones?: string | null
          patient_id: string
          payload_hash?: string | null
          preparacion?: string | null
          prev_hash?: string | null
          prioridad?: Database["public"]["Enums"]["estudio_prioridad"]
          record_hash?: string | null
          signature?: string | null
          signed_at?: string | null
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
          key_id?: string | null
          laboratorio_sugerido?: string | null
          observaciones?: string | null
          patient_id?: string
          payload_hash?: string | null
          preparacion?: string | null
          prev_hash?: string | null
          prioridad?: Database["public"]["Enums"]["estudio_prioridad"]
          record_hash?: string | null
          signature?: string | null
          signed_at?: string | null
          tipo_estudio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estudios_solicitados_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "integrity_keys"
            referencedColumns: ["key_id"]
          },
        ]
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
      glucose_readings: {
        Row: {
          created_at: string
          created_by: string
          device_name: string | null
          external_uuid: string | null
          glucose_mgdl: number
          hours_since_meal: number | null
          id: string
          measurement_context: string
          notes: string | null
          patient_id: string
          requires_review: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          taken_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          device_name?: string | null
          external_uuid?: string | null
          glucose_mgdl: number
          hours_since_meal?: number | null
          id?: string
          measurement_context?: string
          notes?: string | null
          patient_id: string
          requires_review?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          taken_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          device_name?: string | null
          external_uuid?: string | null
          glucose_mgdl?: number
          hours_since_meal?: number | null
          id?: string
          measurement_context?: string
          notes?: string | null
          patient_id?: string
          requires_review?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          taken_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_calendar_events: {
        Row: {
          google_event_id: string
          id: string
          last_synced_at: string
          source_id: string
          source_table: string
          user_id: string
        }
        Insert: {
          google_event_id: string
          id?: string
          last_synced_at?: string
          source_id: string
          source_table: string
          user_id: string
        }
        Update: {
          google_event_id?: string
          id?: string
          last_synced_at?: string
          source_id?: string
          source_table?: string
          user_id?: string
        }
        Relationships: []
      }
      heart_rate_readings: {
        Row: {
          bpm: number
          context: string | null
          created_at: string
          device_name: string | null
          external_uuid: string | null
          id: string
          measured_at: string
          notes: string | null
          patient_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          bpm: number
          context?: string | null
          created_at?: string
          device_name?: string | null
          external_uuid?: string | null
          id?: string
          measured_at?: string
          notes?: string | null
          patient_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          bpm?: number
          context?: string | null
          created_at?: string
          device_name?: string | null
          external_uuid?: string | null
          id?: string
          measured_at?: string
          notes?: string | null
          patient_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      home_visit_requests: {
        Row: {
          created_at: string
          direccion: string
          doctor_id: string | null
          estado: string
          fecha_preferida: string | null
          id: string
          lat: number | null
          lng: number | null
          motivo: string
          notas: string | null
          patient_id: string
          precio_estimado: number | null
          requested_by: string
          updated_at: string
          urgencia: string
        }
        Insert: {
          created_at?: string
          direccion: string
          doctor_id?: string | null
          estado?: string
          fecha_preferida?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          motivo: string
          notas?: string | null
          patient_id: string
          precio_estimado?: number | null
          requested_by: string
          updated_at?: string
          urgencia?: string
        }
        Update: {
          created_at?: string
          direccion?: string
          doctor_id?: string | null
          estado?: string
          fecha_preferida?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          motivo?: string
          notas?: string | null
          patient_id?: string
          precio_estimado?: number | null
          requested_by?: string
          updated_at?: string
          urgencia?: string
        }
        Relationships: []
      }
      hr_alert_settings: {
        Row: {
          created_at: string
          enabled: boolean
          max_bpm: number
          min_bpm: number
          notify_in_app: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          max_bpm?: number
          min_bpm?: number
          notify_in_app?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          max_bpm?: number
          min_bpm?: number
          notify_in_app?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      integrity_daily_roots: {
        Row: {
          daily_root: string
          day: string
          estudios_tip: string | null
          medical_records_tip: string | null
          prev_daily_root: string | null
          published_at: string
          published_ref: string | null
          recetas_tip: string | null
        }
        Insert: {
          daily_root: string
          day: string
          estudios_tip?: string | null
          medical_records_tip?: string | null
          prev_daily_root?: string | null
          published_at?: string
          published_ref?: string | null
          recetas_tip?: string | null
        }
        Update: {
          daily_root?: string
          day?: string
          estudios_tip?: string | null
          medical_records_tip?: string | null
          prev_daily_root?: string | null
          published_at?: string
          published_ref?: string | null
          recetas_tip?: string | null
        }
        Relationships: []
      }
      integrity_keys: {
        Row: {
          activated_at: string
          algorithm: string
          created_by: string | null
          key_id: string
          notes: string | null
          retired_at: string | null
          status: string
        }
        Insert: {
          activated_at?: string
          algorithm?: string
          created_by?: string | null
          key_id: string
          notes?: string | null
          retired_at?: string | null
          status?: string
        }
        Update: {
          activated_at?: string
          algorithm?: string
          created_by?: string | null
          key_id?: string
          notes?: string | null
          retired_at?: string | null
          status?: string
        }
        Relationships: []
      }
      integrity_share_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          max_uses: number | null
          note: string | null
          patient_id: string
          record_id: string | null
          revoked_at: string | null
          scope: string
          table_name: string | null
          token: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          max_uses?: number | null
          note?: string | null
          patient_id: string
          record_id?: string | null
          revoked_at?: string | null
          scope: string
          table_name?: string | null
          token?: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          max_uses?: number | null
          note?: string | null
          patient_id?: string
          record_id?: string | null
          revoked_at?: string | null
          scope?: string
          table_name?: string | null
          token?: string
          uses_count?: number
        }
        Relationships: []
      }
      integrity_verification_log: {
        Row: {
          algorithm_version: string
          chain_ok: boolean | null
          created_at: string
          detail: Json | null
          has_signature: boolean | null
          id: string
          ip: unknown
          key_id: string | null
          patient_id: string | null
          payload_ok: boolean | null
          record_id: string
          share_token: string | null
          signature_ok: boolean | null
          status: string
          table_name: string
          user_agent: string | null
          verifier_id: string | null
          verifier_type: string
        }
        Insert: {
          algorithm_version?: string
          chain_ok?: boolean | null
          created_at?: string
          detail?: Json | null
          has_signature?: boolean | null
          id?: string
          ip?: unknown
          key_id?: string | null
          patient_id?: string | null
          payload_ok?: boolean | null
          record_id: string
          share_token?: string | null
          signature_ok?: boolean | null
          status: string
          table_name: string
          user_agent?: string | null
          verifier_id?: string | null
          verifier_type: string
        }
        Update: {
          algorithm_version?: string
          chain_ok?: boolean | null
          created_at?: string
          detail?: Json | null
          has_signature?: boolean | null
          id?: string
          ip?: unknown
          key_id?: string | null
          patient_id?: string | null
          payload_ok?: boolean | null
          record_id?: string
          share_token?: string | null
          signature_ok?: boolean | null
          status?: string
          table_name?: string
          user_agent?: string | null
          verifier_id?: string | null
          verifier_type?: string
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
      mcp_tool_call_logs: {
        Row: {
          client_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          params_summary: Json
          status: string
          tool_name: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          params_summary?: Json
          status?: string
          tool_name: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          params_summary?: Json
          status?: string
          tool_name?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      medical_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          activa: boolean
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          mensaje: string | null
          patient_id: string
          ref_id: string | null
          ref_table: string | null
          severidad: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          activa?: boolean
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          mensaje?: string | null
          patient_id: string
          ref_id?: string | null
          ref_table?: string | null
          severidad?: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          activa?: boolean
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          mensaje?: string | null
          patient_id?: string
          ref_id?: string | null
          ref_table?: string | null
          severidad?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_history_allergies: {
        Row: {
          created_at: string
          created_by: string
          id: string
          notas: string | null
          patient_id: string
          reaccion: string | null
          severidad: string
          sustancia: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          notas?: string | null
          patient_id: string
          reaccion?: string | null
          severidad?: string
          sustancia: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          notas?: string | null
          patient_id?: string
          reaccion?: string | null
          severidad?: string
          sustancia?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_history_conditions: {
        Row: {
          created_at: string
          created_by: string
          diagnosticado_en: string | null
          estado: string
          id: string
          nombre: string
          notas: string | null
          patient_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          diagnosticado_en?: string | null
          estado?: string
          id?: string
          nombre: string
          notas?: string | null
          patient_id: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          diagnosticado_en?: string | null
          estado?: string
          id?: string
          nombre?: string
          notas?: string | null
          patient_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_history_family: {
        Row: {
          condicion: string
          created_at: string
          created_by: string
          edad_diagnostico: number | null
          id: string
          notas: string | null
          parentesco: string
          patient_id: string
          updated_at: string
          vive: boolean
        }
        Insert: {
          condicion: string
          created_at?: string
          created_by: string
          edad_diagnostico?: number | null
          id?: string
          notas?: string | null
          parentesco: string
          patient_id: string
          updated_at?: string
          vive?: boolean
        }
        Update: {
          condicion?: string
          created_at?: string
          created_by?: string
          edad_diagnostico?: number | null
          id?: string
          notas?: string | null
          parentesco?: string
          patient_id?: string
          updated_at?: string
          vive?: boolean
        }
        Relationships: []
      }
      medical_history_lifestyle: {
        Row: {
          alcohol: string
          alcohol_unidades_semana: number | null
          created_at: string
          created_by: string
          ejercicio: string
          ejercicio_minutos_semana: number | null
          id: string
          notas: string | null
          patient_id: string
          tabaco: string
          tabaco_cantidad_dia: number | null
          updated_at: string
          vacunas: Json
        }
        Insert: {
          alcohol?: string
          alcohol_unidades_semana?: number | null
          created_at?: string
          created_by: string
          ejercicio?: string
          ejercicio_minutos_semana?: number | null
          id?: string
          notas?: string | null
          patient_id: string
          tabaco?: string
          tabaco_cantidad_dia?: number | null
          updated_at?: string
          vacunas?: Json
        }
        Update: {
          alcohol?: string
          alcohol_unidades_semana?: number | null
          created_at?: string
          created_by?: string
          ejercicio?: string
          ejercicio_minutos_semana?: number | null
          id?: string
          notas?: string | null
          patient_id?: string
          tabaco?: string
          tabaco_cantidad_dia?: number | null
          updated_at?: string
          vacunas?: Json
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          created_at: string
          description: string | null
          file_path: string
          id: string
          key_id: string | null
          payload_hash: string | null
          prev_hash: string | null
          record_date: string
          record_hash: string | null
          record_type: Database["public"]["Enums"]["medical_record_type"]
          signature: string | null
          signed_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path: string
          id?: string
          key_id?: string | null
          payload_hash?: string | null
          prev_hash?: string | null
          record_date?: string
          record_hash?: string | null
          record_type: Database["public"]["Enums"]["medical_record_type"]
          signature?: string | null
          signed_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string
          id?: string
          key_id?: string | null
          payload_hash?: string | null
          prev_hash?: string | null
          record_date?: string
          record_hash?: string | null
          record_type?: Database["public"]["Enums"]["medical_record_type"]
          signature?: string | null
          signed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "integrity_keys"
            referencedColumns: ["key_id"]
          },
        ]
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
      medico_invoices: {
        Row: {
          appointment_id: string | null
          cadena_original: string | null
          concepto: string
          condiciones_pago: string | null
          cp_receptor: string | null
          created_at: string
          doctor_id: string
          emisor_id: string | null
          emisor_type: string | null
          error_timbrado: string | null
          estado: string
          fecha: string
          fecha_timbrado: string | null
          folio: string
          forma_pago: string | null
          home_visit_id: string | null
          id: string
          iva: number
          metodo_pago: string | null
          modo: string | null
          moneda: string | null
          no_certificado: string | null
          no_certificado_sat: string | null
          notas: string | null
          patient_id: string | null
          pdf_url: string | null
          razon_social_receptor: string | null
          regimen_fiscal_receptor: string | null
          rfc_receptor: string | null
          sello: string | null
          sello_sat: string | null
          serie: string | null
          subtotal: number
          total: number
          updated_at: string
          uso_cfdi: string | null
          uuid_sat: string | null
          xml_url: string | null
        }
        Insert: {
          appointment_id?: string | null
          cadena_original?: string | null
          concepto: string
          condiciones_pago?: string | null
          cp_receptor?: string | null
          created_at?: string
          doctor_id: string
          emisor_id?: string | null
          emisor_type?: string | null
          error_timbrado?: string | null
          estado?: string
          fecha?: string
          fecha_timbrado?: string | null
          folio: string
          forma_pago?: string | null
          home_visit_id?: string | null
          id?: string
          iva?: number
          metodo_pago?: string | null
          modo?: string | null
          moneda?: string | null
          no_certificado?: string | null
          no_certificado_sat?: string | null
          notas?: string | null
          patient_id?: string | null
          pdf_url?: string | null
          razon_social_receptor?: string | null
          regimen_fiscal_receptor?: string | null
          rfc_receptor?: string | null
          sello?: string | null
          sello_sat?: string | null
          serie?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          uso_cfdi?: string | null
          uuid_sat?: string | null
          xml_url?: string | null
        }
        Update: {
          appointment_id?: string | null
          cadena_original?: string | null
          concepto?: string
          condiciones_pago?: string | null
          cp_receptor?: string | null
          created_at?: string
          doctor_id?: string
          emisor_id?: string | null
          emisor_type?: string | null
          error_timbrado?: string | null
          estado?: string
          fecha?: string
          fecha_timbrado?: string | null
          folio?: string
          forma_pago?: string | null
          home_visit_id?: string | null
          id?: string
          iva?: number
          metodo_pago?: string | null
          modo?: string | null
          moneda?: string | null
          no_certificado?: string | null
          no_certificado_sat?: string | null
          notas?: string | null
          patient_id?: string | null
          pdf_url?: string | null
          razon_social_receptor?: string | null
          regimen_fiscal_receptor?: string | null
          rfc_receptor?: string | null
          sello?: string | null
          sello_sat?: string | null
          serie?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          uso_cfdi?: string | null
          uuid_sat?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medico_invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_invoices_home_visit_id_fkey"
            columns: ["home_visit_id"]
            isOneToOne: false
            referencedRelation: "home_visit_requests"
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
      notification_preferences: {
        Row: {
          clinical_alerts: boolean
          pending_validated: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          remind_appointment_1h: boolean
          remind_appointment_24h: boolean
          reminders: boolean
          system_messages: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          clinical_alerts?: boolean
          pending_validated?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          remind_appointment_1h?: boolean
          remind_appointment_24h?: boolean
          reminders?: boolean
          system_messages?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          clinical_alerts?: boolean
          pending_validated?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          remind_appointment_1h?: boolean
          remind_appointment_24h?: boolean
          reminders?: boolean
          system_messages?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          category: string | null
          created_at: string
          event_key: string | null
          id: string
          link: string | null
          push_sent_at: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          category?: string | null
          created_at?: string
          event_key?: string | null
          id?: string
          link?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string
          event_key?: string | null
          id?: string
          link?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      nutricionista_profiles: {
        Row: {
          bio: string | null
          cedula: string | null
          consultorio: string | null
          created_at: string
          especialidad: string | null
          precio_consulta: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          cedula?: string | null
          consultorio?: string | null
          created_at?: string
          especialidad?: string | null
          precio_consulta?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          cedula?: string | null
          consultorio?: string | null
          created_at?: string
          especialidad?: string | null
          precio_consulta?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_food_traffic: {
        Row: {
          alimento: string
          color: string
          created_at: string
          created_by: string
          grupo: string | null
          id: string
          notas: string | null
          patient_id: string | null
          updated_at: string
        }
        Insert: {
          alimento: string
          color?: string
          created_at?: string
          created_by: string
          grupo?: string | null
          id?: string
          notas?: string | null
          patient_id?: string | null
          updated_at?: string
        }
        Update: {
          alimento?: string
          color?: string
          created_at?: string
          created_by?: string
          grupo?: string | null
          id?: string
          notas?: string | null
          patient_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_meal_plan_items: {
        Row: {
          alimento: string
          alternativas: Json
          created_at: string
          dia_semana: number
          id: string
          kcal: number | null
          momento: string
          orden: number
          plan_id: string
          porcion: string | null
          unidad: string | null
          updated_at: string
        }
        Insert: {
          alimento: string
          alternativas?: Json
          created_at?: string
          dia_semana: number
          id?: string
          kcal?: number | null
          momento: string
          orden?: number
          plan_id: string
          porcion?: string | null
          unidad?: string | null
          updated_at?: string
        }
        Update: {
          alimento?: string
          alternativas?: Json
          created_at?: string
          dia_semana?: number
          id?: string
          kcal?: number | null
          momento?: string
          orden?: number
          plan_id?: string
          porcion?: string | null
          unidad?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_meal_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_meal_plans: {
        Row: {
          activo: boolean
          created_at: string
          created_by: string
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          kcal_objetivo: number | null
          notas: string | null
          patient_id: string
          professional_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          created_by?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          kcal_objetivo?: number | null
          notas?: string | null
          patient_id: string
          professional_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          created_by?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          kcal_objetivo?: number | null
          notas?: string | null
          patient_id?: string
          professional_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_metrics: {
        Row: {
          agua_corporal_pct: number | null
          cadera_cm: number | null
          cintura_cm: number | null
          created_at: string
          created_by: string
          grasa_corporal_pct: number | null
          id: string
          imc: number | null
          masa_muscular_kg: number | null
          notas: string | null
          patient_id: string
          peso_kg: number | null
          peso_seco_kg: number | null
          recorded_at: string
          talla_cm: number | null
          updated_at: string
        }
        Insert: {
          agua_corporal_pct?: number | null
          cadera_cm?: number | null
          cintura_cm?: number | null
          created_at?: string
          created_by: string
          grasa_corporal_pct?: number | null
          id?: string
          imc?: number | null
          masa_muscular_kg?: number | null
          notas?: string | null
          patient_id: string
          peso_kg?: number | null
          peso_seco_kg?: number | null
          recorded_at?: string
          talla_cm?: number | null
          updated_at?: string
        }
        Update: {
          agua_corporal_pct?: number | null
          cadera_cm?: number | null
          cintura_cm?: number | null
          created_at?: string
          created_by?: string
          grasa_corporal_pct?: number | null
          id?: string
          imc?: number | null
          masa_muscular_kg?: number | null
          notas?: string | null
          patient_id?: string
          peso_kg?: number | null
          peso_seco_kg?: number | null
          recorded_at?: string
          talla_cm?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ocr_pack_purchases: {
        Row: {
          cantidad_escaneos: number
          created_at: string
          environment: string
          granted_by: string | null
          id: string
          moneda: string
          pack_id: string | null
          paid_at: string | null
          precio_centavos: number
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          cantidad_escaneos: number
          created_at?: string
          environment?: string
          granted_by?: string | null
          id?: string
          moneda?: string
          pack_id?: string | null
          paid_at?: string | null
          precio_centavos?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          cantidad_escaneos?: number
          created_at?: string
          environment?: string
          granted_by?: string | null
          id?: string
          moneda?: string
          pack_id?: string | null
          paid_at?: string | null
          precio_centavos?: number
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_pack_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "ocr_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_packs: {
        Row: {
          activo: boolean
          cantidad_escaneos: number
          created_at: string
          descripcion: string | null
          id: string
          moneda: string
          nombre: string
          orden: number
          precio_centavos: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          cantidad_escaneos: number
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre: string
          orden?: number
          precio_centavos: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          cantidad_escaneos?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre?: string
          orden?: number
          precio_centavos?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ocr_quotas: {
        Row: {
          addon_balance: number
          period_end: string | null
          period_start: string | null
          subscription_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_balance?: number
          period_end?: string | null
          period_start?: string | null
          subscription_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_balance?: number
          period_end?: string | null
          period_start?: string | null
          subscription_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ocr_usage_log: {
        Row: {
          feature: string
          id: string
          pages: number
          resource_id: string | null
          source: string
          used_at: string
          user_id: string
        }
        Insert: {
          feature?: string
          id?: string
          pages?: number
          resource_id?: string | null
          source: string
          used_at?: string
          user_id: string
        }
        Update: {
          feature?: string
          id?: string
          pages?: number
          resource_id?: string | null
          source?: string
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      odontograma_states: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          estado: string
          id: string
          notas: string | null
          patient_id: string
          pieza: number
          superficie: string | null
          superseded_at: string | null
          superseded_by: string | null
          updated_at: string
          vigente: boolean
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          estado: string
          id?: string
          notas?: string | null
          patient_id: string
          pieza: number
          superficie?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          updated_at?: string
          vigente?: boolean
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          estado?: string
          id?: string
          notas?: string | null
          patient_id?: string
          pieza?: number
          superficie?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          updated_at?: string
          vigente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "odontograma_states_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "odontograma_states"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_ble_pairings: {
        Row: {
          created_at: string
          device_name: string | null
          external_uuid: string
          id: string
          last_connected_at: string | null
          last_error: string | null
          last_error_at: string | null
          last_status: string | null
          model: string | null
          paired_at: string
          patient_id: string
          service_type: string
          unpaired_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          external_uuid: string
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_status?: string | null
          model?: string | null
          paired_at?: string
          patient_id: string
          service_type: string
          unpaired_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          external_uuid?: string
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_status?: string | null
          model?: string | null
          paired_at?: string
          patient_id?: string
          service_type?: string
          unpaired_at?: string | null
          updated_at?: string
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
      pharmacy_branches: {
        Row: {
          activo: boolean
          ciudad: string | null
          codigo: string | null
          cp: string | null
          cp_expedicion: string | null
          created_at: string
          direccion: string | null
          es_principal: boolean
          estado: string | null
          id: string
          nombre: string
          razon_social_emisor: string | null
          regimen_fiscal: string | null
          rfc_emisor: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          ciudad?: string | null
          codigo?: string | null
          cp?: string | null
          cp_expedicion?: string | null
          created_at?: string
          direccion?: string | null
          es_principal?: boolean
          estado?: string | null
          id?: string
          nombre: string
          razon_social_emisor?: string | null
          regimen_fiscal?: string | null
          rfc_emisor?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          ciudad?: string | null
          codigo?: string | null
          cp?: string | null
          cp_expedicion?: string | null
          created_at?: string
          direccion?: string | null
          es_principal?: boolean
          estado?: string | null
          id?: string
          nombre?: string
          razon_social_emisor?: string | null
          regimen_fiscal?: string | null
          rfc_emisor?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pharmacy_catalog: {
        Row: {
          activo: boolean
          branch_id_default: string | null
          categoria: string | null
          codigo_barras: string | null
          codigo_sat: string | null
          costo_promedio_centavos: number
          created_at: string
          descripcion: string | null
          descripcion_larga: string | null
          ecommerce_visible: boolean
          id: string
          imagen_url: string | null
          iva_pct: number
          margen_minimo_pct: number | null
          margen_objetivo_pct: number | null
          moneda: string
          nombre: string
          precio_centavos: number
          presentacion: string | null
          principio_activo: string | null
          requiere_receta: boolean
          sku: string | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          branch_id_default?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          codigo_sat?: string | null
          costo_promedio_centavos?: number
          created_at?: string
          descripcion?: string | null
          descripcion_larga?: string | null
          ecommerce_visible?: boolean
          id?: string
          imagen_url?: string | null
          iva_pct?: number
          margen_minimo_pct?: number | null
          margen_objetivo_pct?: number | null
          moneda?: string
          nombre: string
          precio_centavos: number
          presentacion?: string | null
          principio_activo?: string | null
          requiere_receta?: boolean
          sku?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          branch_id_default?: string | null
          categoria?: string | null
          codigo_barras?: string | null
          codigo_sat?: string | null
          costo_promedio_centavos?: number
          created_at?: string
          descripcion?: string | null
          descripcion_larga?: string | null
          ecommerce_visible?: boolean
          id?: string
          imagen_url?: string | null
          iva_pct?: number
          margen_minimo_pct?: number | null
          margen_objetivo_pct?: number | null
          moneda?: string
          nombre?: string
          precio_centavos?: number
          presentacion?: string | null
          principio_activo?: string | null
          requiere_receta?: boolean
          sku?: string | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_catalog_branch_id_default_fkey"
            columns: ["branch_id_default"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_competitor_prices: {
        Row: {
          captured_at: string
          catalog_id: string
          competidor: string
          created_at: string
          disponibilidad: string | null
          fuente: string
          id: string
          precio_centavos: number
          updated_at: string
          url: string | null
        }
        Insert: {
          captured_at?: string
          catalog_id: string
          competidor: string
          created_at?: string
          disponibilidad?: string | null
          fuente?: string
          id?: string
          precio_centavos: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          captured_at?: string
          catalog_id?: string
          competidor?: string
          created_at?: string
          disponibilidad?: string | null
          fuente?: string
          id?: string
          precio_centavos?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_competitor_prices_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_customer_charges: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          fecha: string
          folio: string | null
          id: string
          monto_centavos: number
          notas: string | null
          order_id: string | null
          saldo_centavos: number
          updated_at: string
          vence_el: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          fecha?: string
          folio?: string | null
          id?: string
          monto_centavos: number
          notas?: string | null
          order_id?: string | null
          saldo_centavos: number
          updated_at?: string
          vence_el: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          fecha?: string
          folio?: string | null
          id?: string
          monto_centavos?: number
          notas?: string | null
          order_id?: string | null
          saldo_centavos?: number
          updated_at?: string
          vence_el?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_customer_charges_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_customer_charges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pos_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_customer_charges_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_customer_payments: {
        Row: {
          branch_id: string | null
          charge_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          fecha: string
          folio: string | null
          id: string
          metodo: string
          monto_centavos: number
          notas: string | null
          referencia: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          charge_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          fecha?: string
          folio?: string | null
          id?: string
          metodo?: string
          monto_centavos: number
          notas?: string | null
          referencia?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          charge_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          fecha?: string
          folio?: string | null
          id?: string
          metodo?: string
          monto_centavos?: number
          notas?: string | null
          referencia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_customer_payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_customer_payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_customer_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "pos_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_inventory: {
        Row: {
          catalog_id: string
          costo_unitario_centavos: number
          stock_actual: number
          stock_minimo: number
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          catalog_id: string
          costo_unitario_centavos?: number
          stock_actual?: number
          stock_minimo?: number
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          catalog_id?: string
          costo_unitario_centavos?: number
          stock_actual?: number
          stock_minimo?: number
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_inventory_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: true
            referencedRelation: "pharmacy_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_inventory_movements: {
        Row: {
          branch_id: string | null
          cantidad: number
          catalog_id: string
          created_at: string
          created_by: string
          id: string
          lot_id: string | null
          motivo: string | null
          order_id: string | null
          tipo: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Insert: {
          branch_id?: string | null
          cantidad: number
          catalog_id: string
          created_at?: string
          created_by: string
          id?: string
          lot_id?: string | null
          motivo?: string | null
          order_id?: string | null
          tipo: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Update: {
          branch_id?: string | null
          cantidad?: number
          catalog_id?: string
          created_at?: string
          created_by?: string
          id?: string
          lot_id?: string | null
          motivo?: string | null
          order_id?: string | null
          tipo?: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_movements_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_lot_movements: {
        Row: {
          branch_id: string
          cantidad: number
          catalog_id: string
          costo_unitario_centavos: number | null
          created_at: string
          created_by: string | null
          id: string
          lot_id: string
          motivo: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
        }
        Insert: {
          branch_id: string
          cantidad: number
          catalog_id: string
          costo_unitario_centavos?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lot_id: string
          motivo?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
        }
        Update: {
          branch_id?: string
          cantidad?: number
          catalog_id?: string
          costo_unitario_centavos?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lot_id?: string
          motivo?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_lot_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_lot_movements_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_lot_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_lots: {
        Row: {
          branch_id: string
          caducidad: string
          cantidad_actual: number
          cantidad_inicial: number
          catalog_id: string
          costo_unitario_centavos: number
          created_at: string
          created_by: string | null
          estado: string
          fecha_ingreso: string
          id: string
          lote: string
          notas: string | null
          proveedor_id: string | null
          purchase_id: string | null
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          caducidad: string
          cantidad_actual: number
          cantidad_inicial: number
          catalog_id: string
          costo_unitario_centavos?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_ingreso?: string
          id?: string
          lote: string
          notas?: string | null
          proveedor_id?: string | null
          purchase_id?: string | null
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          caducidad?: string
          cantidad_actual?: number
          cantidad_inicial?: number
          catalog_id?: string
          costo_unitario_centavos?: number
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_ingreso?: string
          id?: string
          lote?: string
          notas?: string | null
          proveedor_id?: string | null
          purchase_id?: string | null
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_lots_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_lots_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_lots_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_order_items: {
        Row: {
          cantidad: number
          catalog_id: string | null
          codigo_sat: string | null
          costo_unitario_centavos: number
          created_at: string
          id: string
          iva_pct: number
          lote_id: string | null
          margen_aplicado_pct: number | null
          nombre_snapshot: string
          order_id: string
          precio_unitario_centavos: number
          presentacion_snapshot: string | null
          subtotal_centavos: number
        }
        Insert: {
          cantidad?: number
          catalog_id?: string | null
          codigo_sat?: string | null
          costo_unitario_centavos?: number
          created_at?: string
          id?: string
          iva_pct?: number
          lote_id?: string | null
          margen_aplicado_pct?: number | null
          nombre_snapshot: string
          order_id: string
          precio_unitario_centavos: number
          presentacion_snapshot?: string | null
          subtotal_centavos: number
        }
        Update: {
          cantidad?: number
          catalog_id?: string | null
          codigo_sat?: string | null
          costo_unitario_centavos?: number
          created_at?: string
          id?: string
          iva_pct?: number
          lote_id?: string | null
          margen_aplicado_pct?: number | null
          nombre_snapshot?: string
          order_id?: string
          precio_unitario_centavos?: number
          presentacion_snapshot?: string | null
          subtotal_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_order_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_order_items_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_orders: {
        Row: {
          branch_id: string | null
          cfdi_pdf_path: string | null
          cfdi_timbrado_at: string | null
          cfdi_uuid: string | null
          cfdi_xml_path: string | null
          cliente_cp: string | null
          cliente_email: string | null
          cliente_nombre: string | null
          cliente_rfc: string | null
          created_at: string
          created_by: string
          descuento_centavos: number
          environment: string
          folio: string | null
          forma_pago: string | null
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          iva_centavos: number
          metodo_pago: string | null
          moneda: string
          notas: string | null
          paid_at: string | null
          patient_id: string
          receta_id: string | null
          regimen_fiscal_receptor: string | null
          requiere_cfdi: boolean
          status: Database["public"]["Enums"]["pharmacy_order_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal_centavos: number
          tipo: string
          total_centavos: number
          updated_at: string
          uso_cfdi: string | null
        }
        Insert: {
          branch_id?: string | null
          cfdi_pdf_path?: string | null
          cfdi_timbrado_at?: string | null
          cfdi_uuid?: string | null
          cfdi_xml_path?: string | null
          cliente_cp?: string | null
          cliente_email?: string | null
          cliente_nombre?: string | null
          cliente_rfc?: string | null
          created_at?: string
          created_by: string
          descuento_centavos?: number
          environment?: string
          folio?: string | null
          forma_pago?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          iva_centavos?: number
          metodo_pago?: string | null
          moneda?: string
          notas?: string | null
          paid_at?: string | null
          patient_id: string
          receta_id?: string | null
          regimen_fiscal_receptor?: string | null
          requiere_cfdi?: boolean
          status?: Database["public"]["Enums"]["pharmacy_order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_centavos?: number
          tipo?: string
          total_centavos?: number
          updated_at?: string
          uso_cfdi?: string | null
        }
        Update: {
          branch_id?: string | null
          cfdi_pdf_path?: string | null
          cfdi_timbrado_at?: string | null
          cfdi_uuid?: string | null
          cfdi_xml_path?: string | null
          cliente_cp?: string | null
          cliente_email?: string | null
          cliente_nombre?: string | null
          cliente_rfc?: string | null
          created_at?: string
          created_by?: string
          descuento_centavos?: number
          environment?: string
          folio?: string | null
          forma_pago?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          iva_centavos?: number
          metodo_pago?: string | null
          moneda?: string
          notas?: string | null
          paid_at?: string | null
          patient_id?: string
          receta_id?: string | null
          regimen_fiscal_receptor?: string | null
          requiere_cfdi?: boolean
          status?: Database["public"]["Enums"]["pharmacy_order_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal_centavos?: number
          tipo?: string
          total_centavos?: number
          updated_at?: string
          uso_cfdi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_orders_receta_id_fkey"
            columns: ["receta_id"]
            isOneToOne: false
            referencedRelation: "recetas"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_picking_audit: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          order_id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          order_id: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_picking_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_price_change_requests: {
        Row: {
          catalog_id: string
          created_at: string
          estado: string
          id: string
          notas_revision: string | null
          precio_actual_centavos: number
          precio_propuesto_centavos: number
          razon: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          catalog_id: string
          created_at?: string
          estado?: string
          id?: string
          notas_revision?: string | null
          precio_actual_centavos: number
          precio_propuesto_centavos: number
          razon?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          catalog_id?: string
          created_at?: string
          estado?: string
          id?: string
          notas_revision?: string | null
          precio_actual_centavos?: number
          precio_propuesto_centavos?: number
          razon?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_price_change_requests_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_price_history: {
        Row: {
          catalog_id: string
          changed_by: string | null
          created_at: string
          id: string
          motivo: string | null
          precio_anterior_centavos: number
          precio_nuevo_centavos: number
        }
        Insert: {
          catalog_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          precio_anterior_centavos: number
          precio_nuevo_centavos: number
        }
        Update: {
          catalog_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          precio_anterior_centavos?: number
          precio_nuevo_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_price_history_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_purchase_items: {
        Row: {
          caducidad: string | null
          cantidad: number
          catalog_id: string | null
          clave_sat: string | null
          costo_unitario_centavos: number
          created_at: string
          descripcion: string
          id: string
          iva_pct: number
          lot_id: string | null
          lote: string | null
          purchase_id: string
          subtotal_centavos: number
          ubicacion: string | null
        }
        Insert: {
          caducidad?: string | null
          cantidad: number
          catalog_id?: string | null
          clave_sat?: string | null
          costo_unitario_centavos: number
          created_at?: string
          descripcion: string
          id?: string
          iva_pct?: number
          lot_id?: string | null
          lote?: string | null
          purchase_id: string
          subtotal_centavos?: number
          ubicacion?: string | null
        }
        Update: {
          caducidad?: string | null
          cantidad?: number
          catalog_id?: string | null
          clave_sat?: string | null
          costo_unitario_centavos?: number
          created_at?: string
          descripcion?: string
          id?: string
          iva_pct?: number
          lot_id?: string | null
          lote?: string | null
          purchase_id?: string
          subtotal_centavos?: number
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_purchase_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_purchase_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_purchases: {
        Row: {
          aplicada_at: string | null
          branch_id: string
          cfdi_pdf_path: string | null
          cfdi_uuid: string | null
          cfdi_xml_path: string | null
          created_at: string
          created_by: string | null
          estado: string
          fecha: string
          folio: string | null
          fuente: string
          id: string
          iva_centavos: number
          moneda: string
          notas: string | null
          subtotal_centavos: number
          supplier_id: string | null
          supplier_nombre: string
          supplier_rfc: string | null
          total_centavos: number
          updated_at: string
        }
        Insert: {
          aplicada_at?: string | null
          branch_id: string
          cfdi_pdf_path?: string | null
          cfdi_uuid?: string | null
          cfdi_xml_path?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          folio?: string | null
          fuente?: string
          id?: string
          iva_centavos?: number
          moneda?: string
          notas?: string | null
          subtotal_centavos?: number
          supplier_id?: string | null
          supplier_nombre: string
          supplier_rfc?: string | null
          total_centavos?: number
          updated_at?: string
        }
        Update: {
          aplicada_at?: string | null
          branch_id?: string
          cfdi_pdf_path?: string | null
          cfdi_uuid?: string | null
          cfdi_xml_path?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          folio?: string | null
          fuente?: string
          id?: string
          iva_centavos?: number
          moneda?: string
          notas?: string | null
          subtotal_centavos?: number
          supplier_id?: string | null
          supplier_nombre?: string
          supplier_rfc?: string | null
          total_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_purchases_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_suppliers: {
        Row: {
          activo: boolean
          calificacion: number | null
          contacto_email: string | null
          contacto_nombre: string | null
          contacto_telefono: string | null
          created_at: string
          dias_credito: number
          id: string
          nombre_comercial: string | null
          notas: string | null
          razon_social: string
          rfc: string | null
          saldo_centavos: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          calificacion?: number | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          created_at?: string
          dias_credito?: number
          id?: string
          nombre_comercial?: string | null
          notas?: string | null
          razon_social: string
          rfc?: string | null
          saldo_centavos?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          calificacion?: number | null
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          created_at?: string
          dias_credito?: number
          id?: string
          nombre_comercial?: string | null
          notas?: string | null
          razon_social?: string
          rfc?: string | null
          saldo_centavos?: number
          updated_at?: string
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          limite_mensual: number | null
          plan_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          limite_mensual?: number | null
          plan_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          limite_mensual?: number | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_role_features: {
        Row: {
          allowed: boolean
          created_at: string
          feature_key: string
          id: string
          plan_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          feature_key: string
          id?: string
          plan_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          allowed?: boolean
          created_at?: string
          feature_key?: string
          id?: string
          plan_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_role_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_customers: {
        Row: {
          activo: boolean
          ciudad: string | null
          cp: string | null
          created_at: string
          created_by: string | null
          dias_credito: number
          direccion: string | null
          email: string | null
          estado: string | null
          id: string
          limite_credito_centavos: number
          nombre: string
          notas: string | null
          regimen_fiscal: string | null
          rfc: string | null
          saldo_centavos: number
          telefono: string | null
          updated_at: string
          uso_cfdi: string | null
        }
        Insert: {
          activo?: boolean
          ciudad?: string | null
          cp?: string | null
          created_at?: string
          created_by?: string | null
          dias_credito?: number
          direccion?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          limite_credito_centavos?: number
          nombre: string
          notas?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          saldo_centavos?: number
          telefono?: string | null
          updated_at?: string
          uso_cfdi?: string | null
        }
        Update: {
          activo?: boolean
          ciudad?: string | null
          cp?: string | null
          created_at?: string
          created_by?: string | null
          dias_credito?: number
          direccion?: string | null
          email?: string | null
          estado?: string | null
          id?: string
          limite_credito_centavos?: number
          nombre?: string
          notas?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          saldo_centavos?: number
          telefono?: string | null
          updated_at?: string
          uso_cfdi?: string | null
        }
        Relationships: []
      }
      pos_sessions: {
        Row: {
          abierta_at: string
          arqueo_diferencia_centavos: number | null
          branch_id: string
          cajero_id: string
          cerrada_at: string | null
          created_at: string
          estado: string
          fondo_final_centavos: number | null
          fondo_inicial_centavos: number
          id: string
          notas_apertura: string | null
          notas_cierre: string | null
          num_ventas: number
          total_ventas_centavos: number
          updated_at: string
          ventas_efectivo_centavos: number
          ventas_tarjeta_centavos: number
          ventas_transferencia_centavos: number
        }
        Insert: {
          abierta_at?: string
          arqueo_diferencia_centavos?: number | null
          branch_id: string
          cajero_id: string
          cerrada_at?: string | null
          created_at?: string
          estado?: string
          fondo_final_centavos?: number | null
          fondo_inicial_centavos?: number
          id?: string
          notas_apertura?: string | null
          notas_cierre?: string | null
          num_ventas?: number
          total_ventas_centavos?: number
          updated_at?: string
          ventas_efectivo_centavos?: number
          ventas_tarjeta_centavos?: number
          ventas_transferencia_centavos?: number
        }
        Update: {
          abierta_at?: string
          arqueo_diferencia_centavos?: number | null
          branch_id?: string
          cajero_id?: string
          cerrada_at?: string | null
          created_at?: string
          estado?: string
          fondo_final_centavos?: number | null
          fondo_inicial_centavos?: number
          id?: string
          notas_apertura?: string | null
          notas_cierre?: string | null
          num_ventas?: number
          total_ventas_centavos?: number
          updated_at?: string
          ventas_efectivo_centavos?: number
          ventas_tarjeta_centavos?: number
          ventas_transferencia_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_branches"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_recurrences: {
        Row: {
          categoria: string
          created_at: string
          created_by: string
          duracion_min: number
          fecha_fin: string | null
          fecha_inicio: string
          hora_inicio: string
          id: string
          nombre: string
          notas: string | null
          patient_id: string
          rrule: string
          ubicacion: string | null
          updated_at: string
          vigente: boolean
        }
        Insert: {
          categoria?: string
          created_at?: string
          created_by: string
          duracion_min?: number
          fecha_fin?: string | null
          fecha_inicio?: string
          hora_inicio?: string
          id?: string
          nombre: string
          notas?: string | null
          patient_id: string
          rrule: string
          ubicacion?: string | null
          updated_at?: string
          vigente?: boolean
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string
          duracion_min?: number
          fecha_fin?: string | null
          fecha_inicio?: string
          hora_inicio?: string
          id?: string
          nombre?: string
          notas?: string | null
          patient_id?: string
          rrule?: string
          ubicacion?: string | null
          updated_at?: string
          vigente?: boolean
        }
        Relationships: []
      }
      procedure_sessions: {
        Row: {
          appointment_id: string | null
          como_me_fue: string | null
          complicaciones: string | null
          created_at: string
          created_by: string
          id: string
          notas: string | null
          patient_id: string
          peso_post_kg: number | null
          peso_pre_kg: number | null
          presion_post: string | null
          presion_pre: string | null
          recurrence_id: string | null
          scheduled_at: string
          sintomas: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          como_me_fue?: string | null
          complicaciones?: string | null
          created_at?: string
          created_by: string
          id?: string
          notas?: string | null
          patient_id: string
          peso_post_kg?: number | null
          peso_pre_kg?: number | null
          presion_post?: string | null
          presion_pre?: string | null
          recurrence_id?: string | null
          scheduled_at: string
          sintomas?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          como_me_fue?: string | null
          complicaciones?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notas?: string | null
          patient_id?: string
          peso_post_kg?: number | null
          peso_pre_kg?: number | null
          presion_post?: string | null
          presion_pre?: string | null
          recurrence_id?: string | null
          scheduled_at?: string
          sintomas?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_sessions_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "procedure_recurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures_log: {
        Row: {
          created_at: string
          created_by: string
          fecha: string
          id: string
          lugar: string | null
          nombre: string
          observaciones: string | null
          patient_id: string
          profesional: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          fecha: string
          id?: string
          lugar?: string | null
          nombre: string
          observaciones?: string | null
          patient_id: string
          profesional?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          fecha?: string
          id?: string
          lugar?: string | null
          nombre?: string
          observaciones?: string | null
          patient_id?: string
          profesional?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      professional_availability: {
        Row: {
          activo: boolean
          created_at: string
          end_time: string
          id: string
          location_id: string | null
          modalidad: string
          professional_id: string
          slot_minutes: number
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          activo?: boolean
          created_at?: string
          end_time: string
          id?: string
          location_id?: string | null
          modalidad?: string
          professional_id: string
          slot_minutes?: number
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          activo?: boolean
          created_at?: string
          end_time?: string
          id?: string
          location_id?: string | null
          modalidad?: string
          professional_id?: string
          slot_minutes?: number
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "professional_availability_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "professional_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_availability_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_availability_exceptions: {
        Row: {
          created_at: string
          end_time: string | null
          fecha: string
          id: string
          location_id: string | null
          modalidad: string | null
          motivo: string | null
          professional_id: string
          slot_minutes: number | null
          start_time: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          fecha: string
          id?: string
          location_id?: string | null
          modalidad?: string | null
          motivo?: string | null
          professional_id: string
          slot_minutes?: number | null
          start_time?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          fecha?: string
          id?: string
          location_id?: string | null
          modalidad?: string | null
          motivo?: string | null
          professional_id?: string
          slot_minutes?: number | null
          start_time?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_availability_exceptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "professional_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_availability_exceptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_locations: {
        Row: {
          activo: boolean
          ciudad: string
          cp: string | null
          created_at: string
          direccion: string
          es_principal: boolean
          estado: string | null
          horarios: Json | null
          id: string
          lat: number | null
          lng: number | null
          nombre: string
          pais: string
          professional_id: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          ciudad: string
          cp?: string | null
          created_at?: string
          direccion: string
          es_principal?: boolean
          estado?: string | null
          horarios?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          nombre: string
          pais?: string
          professional_id: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          ciudad?: string
          cp?: string | null
          created_at?: string
          direccion?: string
          es_principal?: boolean
          estado?: string | null
          horarios?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          nombre?: string
          pais?: string
          professional_id?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_locations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_profiles: {
        Row: {
          acepta_domicilio: boolean
          acepta_presencial: boolean
          acepta_video: boolean
          anos_experiencia: number | null
          bio: string | null
          cedula_profesional: string | null
          created_at: string
          display_name: string
          enviado_revision_at: string | null
          estado_publicacion: string
          foto_url: string | null
          id: string
          idiomas: string[] | null
          motivo_rechazo: string | null
          precio_consulta_centavos: number | null
          precio_moneda: string
          publicado: boolean
          rating_avg: number
          rating_count: number
          revisado_at: string | null
          revisado_por: string | null
          seguros_aceptados: string[] | null
          slug: string
          telefono_publico: string | null
          tipo: string
          titulo: string | null
          updated_at: string
          user_id: string
          verificado: boolean
          vistas: number
          website: string | null
          whatsapp_publico: string | null
        }
        Insert: {
          acepta_domicilio?: boolean
          acepta_presencial?: boolean
          acepta_video?: boolean
          anos_experiencia?: number | null
          bio?: string | null
          cedula_profesional?: string | null
          created_at?: string
          display_name: string
          enviado_revision_at?: string | null
          estado_publicacion?: string
          foto_url?: string | null
          id?: string
          idiomas?: string[] | null
          motivo_rechazo?: string | null
          precio_consulta_centavos?: number | null
          precio_moneda?: string
          publicado?: boolean
          rating_avg?: number
          rating_count?: number
          revisado_at?: string | null
          revisado_por?: string | null
          seguros_aceptados?: string[] | null
          slug: string
          telefono_publico?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
          user_id: string
          verificado?: boolean
          vistas?: number
          website?: string | null
          whatsapp_publico?: string | null
        }
        Update: {
          acepta_domicilio?: boolean
          acepta_presencial?: boolean
          acepta_video?: boolean
          anos_experiencia?: number | null
          bio?: string | null
          cedula_profesional?: string | null
          created_at?: string
          display_name?: string
          enviado_revision_at?: string | null
          estado_publicacion?: string
          foto_url?: string | null
          id?: string
          idiomas?: string[] | null
          motivo_rechazo?: string | null
          precio_consulta_centavos?: number | null
          precio_moneda?: string
          publicado?: boolean
          rating_avg?: number
          rating_count?: number
          revisado_at?: string | null
          revisado_por?: string | null
          seguros_aceptados?: string[] | null
          slug?: string
          telefono_publico?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
          user_id?: string
          verificado?: boolean
          vistas?: number
          website?: string | null
          whatsapp_publico?: string | null
        }
        Relationships: []
      }
      professional_specialties: {
        Row: {
          es_principal: boolean
          professional_id: string
          specialty_id: string
        }
        Insert: {
          es_principal?: boolean
          professional_id: string
          specialty_id: string
        }
        Update: {
          es_principal?: boolean
          professional_id?: string
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_specialties_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professional_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_specialties_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_role: Database["public"]["Enums"]["app_role"] | null
          address: string | null
          banco: string | null
          birth_country: string | null
          birth_state: string | null
          cargo_pep: string | null
          certificate_number: string | null
          clabe: string | null
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
          health_last_synced_at: string | null
          id: string
          interior_number: string | null
          maternal_surname: string
          medico_tratante_apellido_m: string | null
          medico_tratante_apellido_p: string | null
          medico_tratante_cedula: string | null
          medico_tratante_cedula_esp: string | null
          medico_tratante_especialidad: string | null
          medico_tratante_hospital: string | null
          medico_tratante_nombre: string | null
          medico_tratante_telefono: string | null
          municipality: string | null
          nationality: string | null
          neighborhood: string | null
          numero_identificacion: string | null
          occupation: string | null
          paternal_surname: string
          phone: string | null
          postal_code: string | null
          privacy_accepted_at: string | null
          privacy_version: string | null
          relationship_to_titular: string | null
          rfc: string | null
          sex: string | null
          state: string | null
          street: string | null
          street_number: string | null
          telefono_celular: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          tipo_identificacion: string | null
          titular_cuenta: string | null
          updated_at: string
          user_id: string
          vigencia_identificacion: string | null
        }
        Insert: {
          active_role?: Database["public"]["Enums"]["app_role"] | null
          address?: string | null
          banco?: string | null
          birth_country?: string | null
          birth_state?: string | null
          cargo_pep?: string | null
          certificate_number?: string | null
          clabe?: string | null
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
          health_last_synced_at?: string | null
          id?: string
          interior_number?: string | null
          maternal_surname?: string
          medico_tratante_apellido_m?: string | null
          medico_tratante_apellido_p?: string | null
          medico_tratante_cedula?: string | null
          medico_tratante_cedula_esp?: string | null
          medico_tratante_especialidad?: string | null
          medico_tratante_hospital?: string | null
          medico_tratante_nombre?: string | null
          medico_tratante_telefono?: string | null
          municipality?: string | null
          nationality?: string | null
          neighborhood?: string | null
          numero_identificacion?: string | null
          occupation?: string | null
          paternal_surname?: string
          phone?: string | null
          postal_code?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          relationship_to_titular?: string | null
          rfc?: string | null
          sex?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          telefono_celular?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          tipo_identificacion?: string | null
          titular_cuenta?: string | null
          updated_at?: string
          user_id: string
          vigencia_identificacion?: string | null
        }
        Update: {
          active_role?: Database["public"]["Enums"]["app_role"] | null
          address?: string | null
          banco?: string | null
          birth_country?: string | null
          birth_state?: string | null
          cargo_pep?: string | null
          certificate_number?: string | null
          clabe?: string | null
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
          health_last_synced_at?: string | null
          id?: string
          interior_number?: string | null
          maternal_surname?: string
          medico_tratante_apellido_m?: string | null
          medico_tratante_apellido_p?: string | null
          medico_tratante_cedula?: string | null
          medico_tratante_cedula_esp?: string | null
          medico_tratante_especialidad?: string | null
          medico_tratante_hospital?: string | null
          medico_tratante_nombre?: string | null
          medico_tratante_telefono?: string | null
          municipality?: string | null
          nationality?: string | null
          neighborhood?: string | null
          numero_identificacion?: string | null
          occupation?: string | null
          paternal_surname?: string
          phone?: string | null
          postal_code?: string | null
          privacy_accepted_at?: string | null
          privacy_version?: string | null
          relationship_to_titular?: string | null
          rfc?: string | null
          sex?: string | null
          state?: string | null
          street?: string | null
          street_number?: string | null
          telefono_celular?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          tipo_identificacion?: string | null
          titular_cuenta?: string | null
          updated_at?: string
          user_id?: string
          vigencia_identificacion?: string | null
        }
        Relationships: []
      }
      reading_reviews: {
        Row: {
          action: string
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          reading_id: string
          reading_kind: string
          reviewer_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          reading_id: string
          reading_kind: string
          reviewer_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reading_id?: string
          reading_kind?: string
          reviewer_id?: string | null
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
          key_id: string | null
          marca_comercial: string | null
          medicamento_nombre: string | null
          observaciones: string | null
          patient_id: string
          payload_hash: string | null
          precio_aproximado: number | null
          prev_hash: string | null
          record_hash: string | null
          signature: string | null
          signed_at: string | null
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
          key_id?: string | null
          marca_comercial?: string | null
          medicamento_nombre?: string | null
          observaciones?: string | null
          patient_id: string
          payload_hash?: string | null
          precio_aproximado?: number | null
          prev_hash?: string | null
          record_hash?: string | null
          signature?: string | null
          signed_at?: string | null
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
          key_id?: string | null
          marca_comercial?: string | null
          medicamento_nombre?: string | null
          observaciones?: string | null
          patient_id?: string
          payload_hash?: string | null
          precio_aproximado?: number | null
          prev_hash?: string | null
          record_hash?: string | null
          signature?: string | null
          signed_at?: string | null
          unidad_dosis?: string | null
          updated_at?: string
          via_administracion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recetas_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "integrity_keys"
            referencedColumns: ["key_id"]
          },
        ]
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
      share_links: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          note: string | null
          owner_id: string
          resource_id: string
          resource_type: Database["public"]["Enums"]["share_resource_type"]
          revoked_at: string | null
          token: string
          updated_at: string
          view_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          note?: string | null
          owner_id: string
          resource_id: string
          resource_type: Database["public"]["Enums"]["share_resource_type"]
          revoked_at?: string | null
          token?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          note?: string | null
          owner_id?: string
          resource_id?: string
          resource_type?: Database["public"]["Enums"]["share_resource_type"]
          revoked_at?: string | null
          token?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      specialties: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          icono: string | null
          id: string
          nombre: string
          nombre_plural: string | null
          sinonimos: string[] | null
          slug: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre: string
          nombre_plural?: string | null
          sinonimos?: string[] | null
          slug: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          icono?: string | null
          id?: string
          nombre?: string
          nombre_plural?: string | null
          sinonimos?: string[] | null
          slug?: string
        }
        Relationships: []
      }
      spo2_readings: {
        Row: {
          context: string | null
          created_at: string
          created_by: string
          device_name: string | null
          external_uuid: string | null
          id: string
          notes: string | null
          patient_id: string
          pulse: number | null
          requires_review: boolean
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          spo2: number
          taken_at: string
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_by: string
          device_name?: string | null
          external_uuid?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          pulse?: number | null
          requires_review?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          spo2: number
          taken_at?: string
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          created_by?: string
          device_name?: string | null
          external_uuid?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          pulse?: number | null
          requires_review?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          spo2?: number
          taken_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          moneda: string
          nombre: string
          ocr_pages_per_month: number
          orden: number
          precio_anual_centavos: number
          precio_mensual_centavos: number
          stripe_price_id_anual: string | null
          stripe_price_id_mensual: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre: string
          ocr_pages_per_month?: number
          orden?: number
          precio_anual_centavos?: number
          precio_mensual_centavos?: number
          stripe_price_id_anual?: string | null
          stripe_price_id_mensual?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre?: string
          ocr_pages_per_month?: number
          orden?: number
          precio_anual_centavos?: number
          precio_mensual_centavos?: number
          stripe_price_id_anual?: string | null
          stripe_price_id_mensual?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          plan_id: string | null
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plan_id?: string | null
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          plan_id?: string | null
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      surgeries: {
        Row: {
          cirujano: string | null
          complicaciones: string | null
          created_at: string
          created_by: string
          fecha: string
          hospital: string | null
          id: string
          nombre: string
          notas: string | null
          patient_id: string
          tipo_anestesia: string | null
          updated_at: string
          vigente: boolean
        }
        Insert: {
          cirujano?: string | null
          complicaciones?: string | null
          created_at?: string
          created_by: string
          fecha: string
          hospital?: string | null
          id?: string
          nombre: string
          notas?: string | null
          patient_id: string
          tipo_anestesia?: string | null
          updated_at?: string
          vigente?: boolean
        }
        Update: {
          cirujano?: string | null
          complicaciones?: string | null
          created_at?: string
          created_by?: string
          fecha?: string
          hospital?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          patient_id?: string
          tipo_anestesia?: string | null
          updated_at?: string
          vigente?: boolean
        }
        Relationships: []
      }
      temperature_readings: {
        Row: {
          context: string | null
          created_at: string
          created_by: string
          device_name: string | null
          external_uuid: string | null
          id: string
          method: string | null
          notes: string | null
          patient_id: string
          requires_review: boolean
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          taken_at: string
          temperature_c: number
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_by: string
          device_name?: string | null
          external_uuid?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          patient_id: string
          requires_review?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          taken_at?: string
          temperature_c: number
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          created_by?: string
          device_name?: string | null
          external_uuid?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          patient_id?: string
          requires_review?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          taken_at?: string
          temperature_c?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_ble_devices: {
        Row: {
          created_at: string
          device_id: string
          id: string
          is_whitelisted: boolean
          last_connected_at: string | null
          name: string | null
          service_uuid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          is_whitelisted?: boolean
          last_connected_at?: string | null
          name?: string | null
          service_uuid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          is_whitelisted?: boolean
          last_connected_at?: string | null
          name?: string | null
          service_uuid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_device_verifications: {
        Row: {
          app_version: string | null
          connection_method: string | null
          created_at: string
          device_id: string
          firmware: string | null
          id: string
          marked_compatible: boolean | null
          model_label: string | null
          notes: string | null
          region: string | null
          status: string
          tested_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          connection_method?: string | null
          created_at?: string
          device_id: string
          firmware?: string | null
          id?: string
          marked_compatible?: boolean | null
          model_label?: string | null
          notes?: string | null
          region?: string | null
          status: string
          tested_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          connection_method?: string | null
          created_at?: string
          device_id?: string
          firmware?: string | null
          id?: string
          marked_compatible?: boolean | null
          model_label?: string | null
          notes?: string | null
          region?: string | null
          status?: string
          tested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_google_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          expires_at: string | null
          refresh_token: string | null
          scope: string | null
          sync_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          expires_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          expires_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          sync_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_push_tokens: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
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
      workout_exercises: {
        Row: {
          created_at: string
          duration_seconds: number | null
          equipment: string | null
          id: string
          muscle_group: string | null
          name: string
          notes: string | null
          orden: number
          reps: number | null
          rest_seconds: number | null
          session_id: string
          sets: number | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name: string
          notes?: string | null
          orden?: number
          reps?: number | null
          rest_seconds?: number | null
          session_id: string
          sets?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          equipment?: string | null
          id?: string
          muscle_group?: string | null
          name?: string
          notes?: string | null
          orden?: number
          reps?: number | null
          rest_seconds?: number | null
          session_id?: string
          sets?: number | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed: boolean
          created_at: string
          duration_min: number | null
          fecha: string
          hr_avg: number | null
          id: string
          notes: string | null
          patient_id: string
          plan_id: string | null
          rpe: number | null
          session_id: string | null
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration_min?: number | null
          fecha?: string
          hr_avg?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          plan_id?: string | null
          rpe?: number | null
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration_min?: number | null
          fecha?: string
          hr_avg?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          plan_id?: string | null
          rpe?: number | null
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          ai_generated: boolean
          created_at: string
          created_by: string | null
          days_per_week: number
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["workout_level"]
          name: string
          notes: string | null
          objective: Database["public"]["Enums"]["workout_objective"]
          patient_id: string
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          created_at?: string
          created_by?: string | null
          days_per_week?: number
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["workout_level"]
          name: string
          notes?: string | null
          objective?: Database["public"]["Enums"]["workout_objective"]
          patient_id: string
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          created_at?: string
          created_by?: string | null
          days_per_week?: number
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["workout_level"]
          name?: string
          notes?: string | null
          objective?: Database["public"]["Enums"]["workout_objective"]
          patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          day_of_week: number
          duration_min: number | null
          id: string
          intensity: string | null
          notes: string | null
          orden: number
          plan_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          duration_min?: number | null
          id?: string
          intensity?: string | null
          notes?: string | null
          orden?: number
          plan_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          duration_min?: number | null
          id?: string
          intensity?: string | null
          notes?: string | null
          orden?: number
          plan_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_ai_tokens: {
        Args: { _tokens: number; _user_id: string }
        Returns: undefined
      }
      add_ocr_credits: {
        Args: { _pages: number; _source?: string; _user_id: string }
        Returns: undefined
      }
      assign_free_plan: {
        Args: { _months?: number; _plan_id: string; _user_id: string }
        Returns: undefined
      }
      can_call_external_ai: {
        Args: { _feature_key: string; _user_id: string }
        Returns: Json
      }
      canonical_json: { Args: { _row: Json }; Returns: string }
      check_kari_monthly_limit: { Args: { _user_id: string }; Returns: Json }
      consume_ai_tokens: {
        Args: { _tokens: number; _user_id: string }
        Returns: Json
      }
      consume_ocr_quota: {
        Args: { _pages: number; _resource_id?: string; _user_id: string }
        Returns: Json
      }
      gen_folio: { Args: { _code: string; _insurer: string }; Returns: string }
      gen_pharmacy_folio: {
        Args: { _branch: string; _prefix: string }
        Returns: string
      }
      get_kari_usage_by_user: {
        Args: { _from: string; _limit?: number; _offset?: number; _to: string }
        Returns: {
          cost_usd_micros: number
          email: string
          full_name: string
          last_activity: string
          messages: number
          total_tokens: number
          user_id: string
        }[]
      }
      get_kari_usage_daily: {
        Args: { _from: string; _to: string }
        Returns: {
          cost_usd_micros: number
          day: string
          messages: number
          total_tokens: number
        }[]
      }
      get_kari_usage_summary: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      get_professional_slots: {
        Args: { _from: string; _professional_id: string; _to: string }
        Returns: {
          location_id: string
          modalidad: string
          slot_end: string
          slot_start: string
        }[]
      }
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
      log_ai_audit: {
        Args: {
          _blocked_reason: string
          _consent_checked: boolean
          _fallback_used: boolean
          _feature_key: string
          _input_chars: number
          _latency_ms: number
          _model: string
          _output_chars: number
          _pii_fields: Json
          _provider: string
          _sanitization_notes: string
          _sanitized: boolean
          _sanitized_prompt: string
          _status: string
          _user_id: string
        }
        Returns: string
      }
      mark_notification_pushed: {
        Args: { _notification_id: string }
        Returns: boolean
      }
      pharmacy_customer_aging: {
        Args: { _customer_id: string }
        Returns: {
          bucket_0_30: number
          bucket_31_60: number
          bucket_61_90: number
          bucket_90_plus: number
          proximo_vence: string
          total: number
          vencido: number
        }[]
      }
      pharmacy_lots_rotation_alerts: {
        Args: { _branch_id?: string }
        Returns: {
          alerta: string
          branch_id: string
          caducidad: string
          cantidad_actual: number
          catalog_id: string
          dias_a_caducar: number
          lot_id: string
          lote: string
          producto_nombre: string
          severidad: string
        }[]
      }
      pharmacy_stock_disponible: {
        Args: { _branch_id: string; _catalog_id: string }
        Returns: number
      }
      pos_close_session: {
        Args: { _fondo_final: number; _notas?: string; _session_id: string }
        Returns: Json
      }
      pos_open_session: {
        Args: { _branch_id: string; _fondo_inicial?: number; _notas?: string }
        Returns: string
      }
      resolve_share_token: { Args: { _token: string }; Returns: Json }
      set_active_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sugerir_lotes_fefo: {
        Args: { _branch_id: string; _cantidad: number; _catalog_id: string }
        Returns: {
          caducidad: string
          cantidad_a_tomar: number
          cantidad_disponible: number
          costo_unitario_centavos: number
          lot_id: string
          lote: string
        }[]
      }
      sync_subscription_ocr_quota: {
        Args: { _user_id: string }
        Returns: undefined
      }
      user_has_feature_access: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      user_has_plan_feature: {
        Args: { _feature: string; _user_id: string }
        Returns: boolean
      }
      verify_record_hash: {
        Args: { _id: string; _table: string }
        Returns: Json
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
        | "nutricionista"
        | "odontologo"
        | "farmaceutico"
        | "admin_farmacia"
        | "flebotomista"
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
      inventory_movement_type: "entrada" | "salida" | "surtido" | "ajuste"
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
      pharmacy_order_status:
        | "pendiente_pago"
        | "pagada"
        | "surtida"
        | "cancelada"
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
      share_resource_type:
        | "appointment"
        | "receta"
        | "estudio"
        | "claim"
        | "format"
      workout_level: "principiante" | "intermedio" | "avanzado"
      workout_objective:
        | "perder_peso"
        | "tonificar"
        | "rehabilitacion"
        | "cardio"
        | "fuerza"
        | "mantenimiento"
        | "flexibilidad"
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
        "nutricionista",
        "odontologo",
        "farmaceutico",
        "admin_farmacia",
        "flebotomista",
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
      inventory_movement_type: ["entrada", "salida", "surtido", "ajuste"],
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
      pharmacy_order_status: [
        "pendiente_pago",
        "pagada",
        "surtida",
        "cancelada",
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
      share_resource_type: [
        "appointment",
        "receta",
        "estudio",
        "claim",
        "format",
      ],
      workout_level: ["principiante", "intermedio", "avanzado"],
      workout_objective: [
        "perder_peso",
        "tonificar",
        "rehabilitacion",
        "cardio",
        "fuerza",
        "mantenimiento",
        "flexibilidad",
      ],
    },
  },
} as const

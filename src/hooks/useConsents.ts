import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ConsentType =
  | "privacy"
  | "treatment"
  | "telemedicine"
  | "broker_share"
  | "insurer_share"
  | "ai_kari";

export interface Consent {
  id: string;
  user_id: string;
  patient_id: string;
  consent_type: ConsentType;
  version: string;
  accepted: boolean;
  signature_data_url: string | null;
  signature_pdf_path: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMyConsents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["consents", "mine", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Consent[];
    },
  });
}

export function useRecordConsent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      consent_type: ConsentType;
      version: string;
      accepted?: boolean;
      patient_id?: string;
      signature_data_url?: string | null;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error("Debes iniciar sesión");
      const payload = {
        user_id: user.id,
        patient_id: input.patient_id ?? user.id,
        consent_type: input.consent_type,
        version: input.version,
        accepted: input.accepted ?? true,
        signature_data_url: input.signature_data_url ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        metadata: input.metadata ?? {},
      };
      const { data, error } = await supabase
        .from("consents")
        .insert([payload])
        .select("*")
        .single();
      if (error) throw error;
      return data as Consent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consents"] }),
  });
}

export function useRevokeConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("consents")
        .update({ revoked_at: new Date().toISOString(), accepted: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consents"] }),
  });
}
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BlePairing = {
  id: string;
  patient_id: string;
  external_uuid: string;
  device_name: string | null;
  model: string | null;
  service_type: string;
  paired_at: string;
  last_connected_at: string | null;
  last_status: string | null;
  last_error: string | null;
  last_error_at: string | null;
  unpaired_at: string | null;
};

export function useBlePairings(patientId: string | null | undefined) {
  return useQuery({
    queryKey: ["patient_ble_pairings", patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<BlePairing[]> => {
      const { data, error } = await supabase
        .from("patient_ble_pairings" as any)
        .select("*")
        .eq("patient_id", patientId as string)
        .order("paired_at", { ascending: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
}

export type UpsertPairingInput = {
  patient_id: string;
  external_uuid: string;
  device_name?: string | null;
  model?: string | null;
  service_type: string;
  last_status: "ok" | "error";
  last_error?: string | null;
};

export function useUpsertBlePairing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertPairingInput) => {
      const now = new Date().toISOString();
      const payload: any = {
        patient_id: input.patient_id,
        external_uuid: input.external_uuid,
        device_name: input.device_name ?? null,
        model: input.model ?? null,
        service_type: input.service_type,
        last_status: input.last_status,
        last_connected_at: input.last_status === "ok" ? now : undefined,
        last_error: input.last_status === "error" ? (input.last_error ?? null) : null,
        last_error_at: input.last_status === "error" ? now : null,
      };
      const { error } = await supabase
        .from("patient_ble_pairings" as any)
        .upsert(payload, { onConflict: "patient_id,external_uuid" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["patient_ble_pairings", v.patient_id] });
      qc.invalidateQueries({ queryKey: ["ble_connection_errors", v.patient_id] });
    },
  });
}

export type BleConnectionError = {
  id: string;
  patient_id: string;
  external_uuid: string | null;
  service_type: string | null;
  error_code: string | null;
  error_message: string;
  browser_ua: string | null;
  created_at: string;
};

export function useBleConnectionErrors(patientId: string | null | undefined, limit = 20) {
  return useQuery({
    queryKey: ["ble_connection_errors", patientId, limit],
    enabled: !!patientId,
    queryFn: async (): Promise<BleConnectionError[]> => {
      const { data, error } = await supabase
        .from("ble_connection_errors" as any)
        .select("*")
        .eq("patient_id", patientId as string)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
}

export async function logBleConnectionError(input: {
  patient_id: string;
  external_uuid?: string | null;
  service_type?: string | null;
  error_code?: string | null;
  error_message: string;
}) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
  await supabase.from("ble_connection_errors" as any).insert({
    patient_id: input.patient_id,
    external_uuid: input.external_uuid ?? null,
    service_type: input.service_type ?? null,
    error_code: input.error_code ?? null,
    error_message: input.error_message,
    browser_ua: ua,
  });
}
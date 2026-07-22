import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DeviceTestRequestStatus = "pending" | "in_review" | "verified" | "rejected";

export interface DeviceTestRequest {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string;
  region: string | null;
  firmware: string | null;
  app_version: string | null;
  note: string | null;
  status: DeviceTestRequestStatus;
  evidence_path: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<DeviceTestRequestStatus, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  verified: "Verificada",
  rejected: "Rechazada",
};

export const STATUS_TONE: Record<DeviceTestRequestStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  in_review: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  verified: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

export function useMyDeviceTestRequest(deviceId: string | null | undefined) {
  return useQuery({
    queryKey: ["device_test_requests", "mine", deviceId],
    enabled: !!deviceId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("device_test_requests" as any)
        .select("*")
        .eq("user_id", auth.user.id)
        .eq("device_id", deviceId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as DeviceTestRequest | null;
    },
  });
}

export function useAllDeviceTestRequests(status?: DeviceTestRequestStatus | "all") {
  return useQuery({
    queryKey: ["device_test_requests", "all", status ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("device_test_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown) as DeviceTestRequest[];
    },
  });
}

export function useCreateDeviceTestRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      device_id: string;
      device_name: string;
      region?: string;
      firmware?: string;
      app_version?: string;
      note?: string;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sesión requerida");
      const { data, error } = await supabase
        .from("device_test_requests" as any)
        .insert({ ...payload, user_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["device_test_requests", "mine", vars.device_id] });
      qc.invalidateQueries({ queryKey: ["device_test_requests", "all"] });
    },
  });
}

export function useUpdateDeviceTestRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      status?: DeviceTestRequestStatus;
      resolution_note?: string;
      evidence_path?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (payload.status) patch.status = payload.status;
      if (payload.resolution_note !== undefined) patch.resolution_note = payload.resolution_note;
      if (payload.evidence_path !== undefined) patch.evidence_path = payload.evidence_path;
      if (payload.status && payload.status !== "pending") {
        const { data: auth } = await supabase.auth.getUser();
        patch.resolved_by = auth.user?.id ?? null;
        patch.resolved_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("device_test_requests" as any)
        .update(patch)
        .eq("id", payload.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["device_test_requests"] });
    },
  });
}

export async function getEvidenceSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("device-test-evidence")
    .createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadEvidence(
  requestId: string,
  userId: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${requestId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("device-test-evidence")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}
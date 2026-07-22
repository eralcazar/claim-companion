import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DeviceVerificationStatus = "success" | "partial" | "failed";

export type DeviceVerification = {
  id: string;
  user_id: string;
  device_id: string;
  firmware: string | null;
  app_version: string | null;
  status: DeviceVerificationStatus;
  connection_method: string | null;
  notes: string | null;
  tested_at: string;
  created_at: string;
  region: string | null;
  model_label: string | null;
  marked_compatible: boolean | null;
};

export function useDeviceVerifications(deviceId: string | null | undefined) {
  return useQuery({
    queryKey: ["user_device_verifications", deviceId],
    enabled: !!deviceId,
    queryFn: async (): Promise<DeviceVerification[]> => {
      const { data, error } = await supabase
        .from("user_device_verifications" as any)
        .select("*")
        .eq("device_id", deviceId as string)
        .order("tested_at", { ascending: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
}

export function useMyDeviceVerifications() {
  return useQuery({
    queryKey: ["user_device_verifications", "mine"],
    queryFn: async (): Promise<DeviceVerification[]> => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("user_device_verifications" as any)
        .select("*")
        .eq("user_id", uid)
        .order("tested_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
}

export type CreateDeviceVerificationInput = {
  device_id: string;
  status: DeviceVerificationStatus;
  firmware?: string | null;
  app_version?: string | null;
  connection_method?: string | null;
  notes?: string | null;
  region?: string | null;
  model_label?: string | null;
  marked_compatible?: boolean | null;
};

export function useCreateDeviceVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeviceVerificationInput) => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData.user?.id;
      if (!uid) throw new Error("Sesión requerida");
      const { data, error } = await supabase
        .from("user_device_verifications" as any)
        .insert({ ...input, user_id: uid })
        .select("*")
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["user_device_verifications", vars.device_id] });
      qc.invalidateQueries({ queryKey: ["user_device_verifications", "mine"] });
    },
  });
}

export function useDeleteDeviceVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; device_id: string }) => {
      const { error } = await supabase
        .from("user_device_verifications" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["user_device_verifications", vars.device_id] });
      qc.invalidateQueries({ queryKey: ["user_device_verifications", "mine"] });
    },
  });
}
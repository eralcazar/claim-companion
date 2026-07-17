import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type BleTestSettings = {
  scan_timeout_ms: number;
  read_timeout_ms: number;
  max_retries: number;
  retry_delay_ms: number;
};

export const DEFAULT_BLE_SETTINGS: BleTestSettings = {
  scan_timeout_ms: 8000,
  read_timeout_ms: 8000,
  max_retries: 2,
  retry_delay_ms: 1500,
};

export function useBleTestSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ble_test_settings", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<BleTestSettings> => {
      const { data, error } = await supabase
        .from("ble_test_settings" as any)
        .select("scan_timeout_ms, read_timeout_ms, max_retries, retry_delay_ms")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? DEFAULT_BLE_SETTINGS;
    },
  });

  const save = useMutation({
    mutationFn: async (values: BleTestSettings) => {
      if (!user?.id) throw new Error("Sin sesión");
      const { error } = await supabase.from("ble_test_settings" as any).upsert(
        { user_id: user.id, ...values },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ble_test_settings", user?.id] });
    },
  });

  return {
    settings: query.data ?? DEFAULT_BLE_SETTINGS,
    isLoading: query.isLoading,
    save,
  };
}
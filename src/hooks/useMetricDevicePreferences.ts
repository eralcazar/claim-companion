import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MetricKey = "heart_rate" | "steps" | "sleep" | "spo2";

export type MetricDevicePreference = {
  user_id: string;
  metric: MetricKey | string;
  device_id: string;
  device_label: string | null;
  priority: number;
  updated_at: string;
};

export function useMetricDevicePreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["metric-device-preferences", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MetricDevicePreference[]> => {
      const { data, error } = await supabase
        .from("user_metric_device_preferences" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("metric")
        .order("priority");
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const setPreferred = useMutation({
    mutationFn: async (input: {
      metric: MetricKey;
      device_id: string;
      device_label?: string | null;
    }) => {
      if (!user?.id) throw new Error("Sesión requerida");
      await supabase
        .from("user_metric_device_preferences" as any)
        .update({ priority: 99 })
        .eq("user_id", user.id)
        .eq("metric", input.metric);
      const { error } = await supabase
        .from("user_metric_device_preferences" as any)
        .upsert(
          {
            user_id: user.id,
            metric: input.metric,
            device_id: input.device_id,
            device_label: input.device_label ?? null,
            priority: 1,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,metric,device_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metric-device-preferences"] });
    },
  });

  const clearMetric = useMutation({
    mutationFn: async (metric: MetricKey) => {
      if (!user?.id) throw new Error("Sesión requerida");
      const { error } = await supabase
        .from("user_metric_device_preferences" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("metric", metric);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["metric-device-preferences"] });
    },
  });

  return { list, setPreferred, clearMetric };
}
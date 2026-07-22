import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ConnectionTestMetric = {
  id: string;
  test_id: string;
  metric: "heart_rate" | "steps" | "sleep" | "spo2" | string;
  status: "ok" | "warn" | "error";
  samples_count: number;
  last_value: number | null;
  last_at: string | null;
  error_code: string | null;
  error_message: string | null;
};

export type ConnectionTest = {
  id: string;
  user_id: string;
  run_id: string | null;
  tested_at: string;
  platform: string | null;
  availability: boolean | null;
  overall_status: "ok" | "partial" | "error";
  duration_ms: number | null;
  trigger: "manual" | "auto_retry" | "extended" | string;
  notes: string | null;
  metrics?: ConnectionTestMetric[];
};

export type SaveTestInput = {
  run_id?: string | null;
  platform?: string | null;
  availability?: boolean | null;
  overall_status: ConnectionTest["overall_status"];
  duration_ms?: number | null;
  trigger?: ConnectionTest["trigger"];
  notes?: string | null;
  metrics: Array<Omit<ConnectionTestMetric, "id" | "test_id">>;
};

export function useConnectionTestHistory(limit = 50) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["wearable-connection-tests", user?.id, limit],
    enabled: !!user?.id,
    queryFn: async (): Promise<ConnectionTest[]> => {
      const { data, error } = await supabase
        .from("wearable_connection_tests" as any)
        .select("*, metrics:wearable_connection_test_metrics(*)")
        .eq("user_id", user!.id)
        .order("tested_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (input: SaveTestInput): Promise<ConnectionTest> => {
      if (!user?.id) throw new Error("Sesión requerida");
      const { data: test, error } = await supabase
        .from("wearable_connection_tests" as any)
        .insert({
          user_id: user.id,
          run_id: input.run_id ?? null,
          platform: input.platform ?? null,
          availability: input.availability ?? null,
          overall_status: input.overall_status,
          duration_ms: input.duration_ms ?? null,
          trigger: input.trigger ?? "manual",
          notes: input.notes ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      const rows = input.metrics.map((m) => ({ ...m, test_id: (test as any).id }));
      if (rows.length > 0) {
        const { error: mErr } = await supabase
          .from("wearable_connection_test_metrics" as any)
          .insert(rows);
        if (mErr) throw mErr;
      }
      return test as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wearable-connection-tests"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("wearable_connection_tests" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wearable-connection-tests"] });
    },
  });

  return { list, save, remove };
}
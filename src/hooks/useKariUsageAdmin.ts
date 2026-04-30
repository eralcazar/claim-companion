import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type KariUsageSummary = {
  tokens_consumed: number;
  cost_usd_micros: number;
  active_users: number;
  tokens_purchased: number;
  revenue_cents: number;
  lifetime_granted_total: number;
};

export type KariUsageRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  messages: number;
  total_tokens: number;
  cost_usd_micros: number;
  last_activity: string;
};

export type KariDailyRow = {
  day: string;
  total_tokens: number;
  cost_usd_micros: number;
  messages: number;
};

export type KariMonthlyLimit = {
  id: string;
  plan_id: string | null;
  role: string;
  monthly_token_cap: number;
  enabled: boolean;
};

export function useKariUsageSummary(from: string, to: string) {
  return useQuery({
    queryKey: ["kari_usage_summary", from, to],
    queryFn: async (): Promise<KariUsageSummary> => {
      const { data, error } = await supabase.rpc("get_kari_usage_summary", { _from: from, _to: to });
      if (error) throw error;
      return (data ?? {}) as KariUsageSummary;
    },
  });
}

export function useKariUsageByUser(from: string, to: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["kari_usage_by_user", from, to, limit, offset],
    queryFn: async (): Promise<KariUsageRow[]> => {
      const { data, error } = await supabase.rpc("get_kari_usage_by_user", {
        _from: from, _to: to, _limit: limit, _offset: offset,
      });
      if (error) throw error;
      return (data ?? []) as KariUsageRow[];
    },
  });
}

export function useKariUsageDaily(from: string, to: string) {
  return useQuery({
    queryKey: ["kari_usage_daily", from, to],
    queryFn: async (): Promise<KariDailyRow[]> => {
      const { data, error } = await supabase.rpc("get_kari_usage_daily", { _from: from, _to: to });
      if (error) throw error;
      return (data ?? []) as KariDailyRow[];
    },
  });
}

export function useKariMonthlyLimits() {
  return useQuery({
    queryKey: ["kari_monthly_limits"],
    queryFn: async (): Promise<KariMonthlyLimit[]> => {
      const { data, error } = await supabase
        .from("ai_token_monthly_limits")
        .select("id, plan_id, role, monthly_token_cap, enabled")
        .order("role");
      if (error) throw error;
      return (data ?? []) as KariMonthlyLimit[];
    },
  });
}

export function useUpsertKariLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<KariMonthlyLimit, "id"> & { id?: string }) => {
      const payload = {
        ...(input.id ? { id: input.id } : {}),
        plan_id: input.plan_id,
        role: input.role,
        monthly_token_cap: input.monthly_token_cap,
        enabled: input.enabled,
      };
      const { error } = await supabase.from("ai_token_monthly_limits").upsert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kari_monthly_limits"] });
      toast.success("Límite guardado");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });
}

export function useDeleteKariLimit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_token_monthly_limits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kari_monthly_limits"] });
      toast.success("Límite eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });
}
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { FeatureKey } from "@/lib/features";

export type SubscriptionPlan = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_mensual_centavos: number;
  precio_anual_centavos: number;
  moneda: string;
  stripe_product_id: string | null;
  stripe_price_id_mensual: string | null;
  stripe_price_id_anual: string | null;
  activo: boolean;
  orden: number;
};

export type PlanFeature = {
  id: string;
  plan_id: string;
  feature_key: string;
  limite_mensual: number | null;
};

export function usePlans(opts: { onlyActive?: boolean } = {}) {
  return useQuery({
    queryKey: ["subscription_plans", opts],
    queryFn: async () => {
      let q = supabase.from("subscription_plans").select("*").order("orden");
      if (opts.onlyActive) q = q.eq("activo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SubscriptionPlan[];
    },
  });
}

export function usePlanFeatures() {
  return useQuery({
    queryKey: ["plan_features"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plan_features").select("*");
      if (error) throw error;
      return (data || []) as PlanFeature[];
    },
  });
}

export function useUpsertPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SubscriptionPlan> & { id?: string }) => {
      if (input.id) {
        const { error } = await supabase.from("subscription_plans").update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subscription_plans").insert(input as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription_plans"] });
      toast.success("Plan guardado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription_plans"] });
      toast.success("Plan eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useTogglePlanFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { plan_id: string; feature_key: string; enabled: boolean }) => {
      if (input.enabled) {
        const { error } = await supabase
          .from("plan_features")
          .upsert(
            { plan_id: input.plan_id, feature_key: input.feature_key },
            { onConflict: "plan_id,feature_key" },
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("plan_features")
          .delete()
          .eq("plan_id", input.plan_id)
          .eq("feature_key", input.feature_key);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plan_features"] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
};

export function useSubscription() {
  const { user } = useAuth();
  const subQ = useQuery({
    queryKey: ["my_subscription", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Subscription | null;
    },
  });

  const featuresQ = usePlanFeatures();

  const sub = subQ.data;
  const isActive =
    !!sub &&
    ["active", "trialing"].includes(sub.status) &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

  const planFeatureKeys = new Set<FeatureKey>(
    (featuresQ.data || [])
      .filter((f) => sub && f.plan_id === sub.plan_id)
      .map((f) => f.feature_key as FeatureKey),
  );

  const hasFeature = (key: FeatureKey) => isActive && planFeatureKeys.has(key);

  return {
    subscription: sub,
    isActive,
    hasFeature,
    planFeatureKeys,
    loading: subQ.isLoading || featuresQ.isLoading,
  };
}
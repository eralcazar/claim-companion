import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type KariBalance = {
  user_id: string;
  balance: number;
  lifetime_granted: number;
  lifetime_consumed: number;
};

export function useKariBalance() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["kari_balance", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<KariBalance> => {
      const { data, error } = await supabase
        .from("ai_token_balances")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          user_id: user!.id,
          balance: 0,
          lifetime_granted: 0,
          lifetime_consumed: 0,
        }
      );
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`kari-balance-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_token_balances",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["kari_balance", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  return query;
}

export type AiTokenPack = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  tokens: number;
  precio_centavos: number;
  moneda: string;
  stripe_price_id: string | null;
  activo: boolean;
  orden: number;
};

export function useAiTokenPacks() {
  return useQuery({
    queryKey: ["ai_token_packs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_token_packs")
        .select("*")
        .eq("activo", true)
        .order("orden");
      if (error) throw error;
      return (data || []) as AiTokenPack[];
    },
  });
}

export type KariPurchase = {
  id: string;
  tokens: number;
  amount_cents: number;
  currency: string;
  status: string;
  environment: string;
  created_at: string;
};

export function useMyKariPurchases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_kari_purchases", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<KariPurchase[]> => {
      const { data, error } = await supabase
        .from("ai_token_purchases")
        .select("id, tokens, amount_cents, currency, status, environment, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as KariPurchase[];
    },
    refetchInterval: (q) => {
      const rows = (q.state.data || []) as KariPurchase[];
      return rows.some((r) => r.status === "pending") ? 5000 : false;
    },
  });
}
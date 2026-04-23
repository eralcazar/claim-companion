import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type OcrQuota = {
  user_id: string;
  subscription_balance: number;
  addon_balance: number;
  period_start: string | null;
  period_end: string | null;
  updated_at: string;
};

export type OcrPack = {
  id: string;
  nombre: string;
  descripcion: string | null;
  cantidad_escaneos: number;
  precio_centavos: number;
  moneda: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  activo: boolean;
  orden: number;
};

export function useMyOcrQuota() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_ocr_quota", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OcrQuota> => {
      const { data, error } = await supabase
        .from("ocr_quotas")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          user_id: user!.id,
          subscription_balance: 0,
          addon_balance: 0,
          period_start: null,
          period_end: null,
          updated_at: new Date().toISOString(),
        }
      );
    },
  });
}

export function useOcrPacks(opts: { onlyActive?: boolean } = { onlyActive: true }) {
  return useQuery({
    queryKey: ["ocr_packs", opts],
    queryFn: async () => {
      let q = supabase.from("ocr_packs").select("*").order("orden");
      if (opts.onlyActive) q = q.eq("activo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as OcrPack[];
    },
  });
}

export function useUpsertOcrPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<OcrPack> & { id?: string }) => {
      if (input.id) {
        const { error } = await supabase.from("ocr_packs").update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ocr_packs").insert(input as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ocr_packs"] });
      toast.success("Paquete guardado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteOcrPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ocr_packs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ocr_packs"] });
      toast.success("Paquete eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSyncOcrPack() {
  return useMutation({
    mutationFn: async (input: { pack_id: string; environment: "sandbox" | "live" }) => {
      const { error } = await supabase.functions.invoke("sync-ocr-pack", { body: input });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Paquete publicado en cobros"),
    onError: (e: any) => toast.error(e.message ?? "No se pudo publicar"),
  });
}

export function useAdminGrantOcr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { user_id: string; pages: number }) => {
      const { error } = await supabase.functions.invoke("admin-grant-ocr", { body: input });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_ocr_quota"] });
      toast.success("Escaneos añadidos");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudieron añadir escaneos"),
  });
}

export function totalQuota(q?: OcrQuota | null): number {
  if (!q) return 0;
  return (q.subscription_balance || 0) + (q.addon_balance || 0);
}

export type OcrPackPurchase = {
  id: string;
  user_id: string;
  pack_id: string | null;
  cantidad_escaneos: number;
  precio_centavos: number;
  moneda: string;
  status: string;
  environment: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  granted_by: string | null;
  paid_at: string | null;
  created_at: string;
  ocr_packs?: { nombre: string } | null;
};

export function useMyOcrPurchases() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_ocr_purchases", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OcrPackPurchase[]> => {
      const { data, error } = await supabase
        .from("ocr_pack_purchases")
        .select("*, ocr_packs(nombre)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any;
    },
    refetchInterval: (q) => {
      const rows = (q.state.data || []) as OcrPackPurchase[];
      return rows.some((r) => r.status === "pending") ? 5000 : false;
    },
  });
}
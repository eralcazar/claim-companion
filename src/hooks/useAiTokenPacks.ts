import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AiTokenPack = {
  id: string;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  tokens: number;
  precio_centavos: number;
  moneda: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  activo: boolean;
  orden: number;
};

export function useAiTokenPacks(opts: { onlyActive?: boolean } = { onlyActive: true }) {
  return useQuery({
    queryKey: ["ai_token_packs", opts],
    queryFn: async () => {
      let q = supabase.from("ai_token_packs").select("*").order("orden");
      if (opts.onlyActive) q = q.eq("activo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AiTokenPack[];
    },
  });
}

export function useUpsertAiTokenPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AiTokenPack> & { id?: string }) => {
      if (input.id) {
        const { error } = await supabase.from("ai_token_packs").update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_token_packs").insert(input as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_token_packs"] });
      toast.success("Paquete Kari guardado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAiTokenPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_token_packs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_token_packs"] });
      toast.success("Paquete eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSyncAiTokenPack() {
  return useMutation({
    mutationFn: async (input: { pack_id: string; environment: "sandbox" | "live" }) => {
      const { error } = await supabase.functions.invoke("sync-ai-token-pack", { body: input });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Paquete publicado en cobros"),
    onError: (e: any) => toast.error(e.message ?? "No se pudo publicar"),
  });
}

// ===== AI Settings (modelo activo de Kari) =====

export const KARI_MODEL_OPTIONS: { value: string; label: string; inputMicros: number; outputMicros: number; note: string }[] = [
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", inputMicros: 10, outputMicros: 80, note: "El más económico" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview)", inputMicros: 30, outputMicros: 250, note: "Recomendado" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", inputMicros: 30, outputMicros: 250, note: "Estable" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", inputMicros: 1250, outputMicros: 5000, note: "Premium (~40× más caro)" },
];

export function useKariActiveModel() {
  return useQuery({
    queryKey: ["ai_settings", "kari_active_model"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("value")
        .eq("key", "kari_active_model")
        .maybeSingle();
      if (error) throw error;
      const v = data?.value;
      return (typeof v === "string" ? v : "google/gemini-3-flash-preview") as string;
    },
  });
}

export function useSetKariActiveModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (model: string) => {
      const { error } = await supabase
        .from("ai_settings")
        .upsert({ key: "kari_active_model", value: model as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_settings", "kari_active_model"] });
      toast.success("Modelo de Kari actualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
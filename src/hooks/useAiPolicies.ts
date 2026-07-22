import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AiProviderPolicy = {
  id: string;
  feature_key: string;
  label: string;
  model: string;
  max_input_tokens: number;
  max_output_tokens: number;
  history_window: number;
  enable_cache: boolean;
  cache_ttl_hours: number;
  notes: string | null;
  updated_at: string;
};

export const AI_MODEL_CHOICES = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview)", inputMicros: 30, outputMicros: 250 },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", inputMicros: 30, outputMicros: 250 },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (barato)", inputMicros: 10, outputMicros: 80 },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (caro)", inputMicros: 1250, outputMicros: 5000 },
];

export function useAiPolicies() {
  return useQuery({
    queryKey: ["ai_provider_policy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_provider_policy" as any)
        .select("*")
        .order("feature_key");
      if (error) throw error;
      return (data ?? []) as unknown as AiProviderPolicy[];
    },
  });
}

export function useUpdateAiPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AiProviderPolicy> & { id: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase
        .from("ai_provider_policy" as any)
        .update(rest as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_provider_policy"] });
      toast({ title: "Política actualizada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useAiCacheStats() {
  return useQuery({
    queryKey: ["ai_response_cache_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_response_cache" as any)
        .select("feature_key, hit_count, tokens_saved")
        .limit(1000);
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const byFeature = new Map<string, { entries: number; hits: number; tokensSaved: number }>();
      for (const r of rows) {
        const cur = byFeature.get(r.feature_key) ?? { entries: 0, hits: 0, tokensSaved: 0 };
        cur.entries += 1;
        cur.hits += r.hit_count ?? 0;
        cur.tokensSaved += (r.tokens_saved ?? 0) * (r.hit_count ?? 0);
        byFeature.set(r.feature_key, cur);
      }
      return Array.from(byFeature.entries()).map(([feature_key, v]) => ({ feature_key, ...v }));
    },
  });
}
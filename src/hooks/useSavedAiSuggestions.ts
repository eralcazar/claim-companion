import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { AiReference } from "@/components/ai/AiAnswer";

export type SavedSuggestionStatus = "pending" | "follow" | "ignore";

export type SavedNutritionSuggestion = {
  id: string;
  patient_id: string;
  prompt: string;
  answer_text: string;
  refs: AiReference[];
  provider: string | null;
  model: string | null;
  status: SavedSuggestionStatus;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

export function useSavedSuggestions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai_nutrition_suggestions_saved", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_nutrition_suggestions_saved" as any)
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedNutritionSuggestion[];
    },
  });
}

export function useSaveSuggestion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      prompt: string;
      answer_text: string;
      refs: AiReference[];
      provider?: string | null;
      model?: string | null;
    }) => {
      const { error } = await supabase.from("ai_nutrition_suggestions_saved" as any).insert({
        patient_id: user!.id,
        status: "pending",
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_nutrition_suggestions_saved"] });
      toast.success("Sugerencia guardada");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });
}

export function useUpdateSuggestionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SavedSuggestionStatus }) => {
      const { error } = await supabase
        .from("ai_nutrition_suggestions_saved" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_nutrition_suggestions_saved"] }),
  });
}

export function useDeleteSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_nutrition_suggestions_saved" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai_nutrition_suggestions_saved"] }),
  });
}
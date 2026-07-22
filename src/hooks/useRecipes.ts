import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CatalogItem } from "@/lib/nutrition/macros";

export type RecipeSource = "nutriologa" | "medlineplus" | "web" | "libro" | "manual_paciente";

export type NutritionRecipe = {
  id: string;
  patient_id: string;
  title: string;
  ingredients: Array<{ name: string; grams: number; ingredient_id?: string | null }>;
  steps: string | null;
  servings: number;
  total_kcal: number;
  total_carbs_g: number;
  total_protein_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  source_type: RecipeSource;
  source_url: string | null;
  source_author: string | null;
  attribution: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useIngredientCatalog() {
  return useQuery({
    queryKey: ["nutrition_ingredients_catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_ingredients_catalog" as any)
        .select("id, name, kcal_100g, carbs_g, protein_g, fat_g, fiber_g")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as CatalogItem[];
    },
  });
}

export function useRecipes(patientId?: string) {
  const { user } = useAuth();
  const pid = patientId ?? user?.id;
  return useQuery({
    queryKey: ["nutrition_recipes", pid],
    enabled: !!pid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_recipes" as any)
        .select("*")
        .eq("patient_id", pid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as NutritionRecipe[];
    },
  });
}

export function useUpsertRecipe() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: Partial<NutritionRecipe> & { id?: string }) => {
      if (!user) throw new Error("Sin sesión");
      const payload: any = { ...r, patient_id: user.id };
      if (r.id) {
        const { error } = await supabase.from("nutrition_recipes" as any).update(payload).eq("id", r.id);
        if (error) throw error;
        return r.id;
      }
      const { data, error } = await supabase.from("nutrition_recipes" as any).insert(payload).select("id").single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      toast.success("Receta guardada");
      qc.invalidateQueries({ queryKey: ["nutrition_recipes"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nutrition_recipes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Receta eliminada"); qc.invalidateQueries({ queryKey: ["nutrition_recipes"] }); },
  });
}
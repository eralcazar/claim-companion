import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Momento = "desayuno" | "colacion_am" | "comida" | "colacion_pm" | "cena";

export const MOMENTO_LABEL: Record<Momento, string> = {
  desayuno: "Desayuno",
  colacion_am: "Colación AM",
  comida: "Comida",
  colacion_pm: "Colación PM",
  cena: "Cena",
};

export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

export interface MealPlan {
  id: string;
  patient_id: string;
  professional_id: string | null;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  kcal_objetivo: number | null;
  notas: string | null;
  activo: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MealPlanItem {
  id: string;
  plan_id: string;
  dia_semana: number;
  momento: Momento;
  alimento: string;
  porcion: string | null;
  unidad: string | null;
  kcal: number | null;
  alternativas: string[];
  orden: number;
}

export function useMealPlans(patientId: string | undefined) {
  return useQuery({
    queryKey: ["meal_plans", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_meal_plans" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("fecha_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MealPlan[];
    },
  });
}

export function useMealPlanItems(planId: string | undefined) {
  return useQuery({
    queryKey: ["meal_plan_items", planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_meal_plan_items" as any)
        .select("*")
        .eq("plan_id", planId!)
        .order("dia_semana")
        .order("orden");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        alternativas: Array.isArray(r.alternativas) ? r.alternativas : [],
      })) as MealPlanItem[];
    },
  });
}

export function useCreateMealPlan() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<MealPlan> & { patient_id: string }) => {
      const { data, error } = await supabase
        .from("nutrition_meal_plans" as any)
        .insert({ ...input, created_by: user?.id, professional_id: input.professional_id ?? user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MealPlan;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["meal_plans", p.patient_id] });
      toast.success("Plan creado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MealPlan> }) => {
      const { data, error } = await supabase
        .from("nutrition_meal_plans" as any)
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MealPlan;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["meal_plans", p.patient_id] });
      toast.success("Plan actualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteMealPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nutrition_meal_plans" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meal_plans"] });
      toast.success("Plan eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpsertMealPlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<MealPlanItem> & { plan_id: string; dia_semana: number; momento: Momento; alimento: string }) => {
      if (input.id) {
        const { data, error } = await supabase
          .from("nutrition_meal_plan_items" as any)
          .update({
            alimento: input.alimento,
            porcion: input.porcion ?? null,
            unidad: input.unidad ?? null,
            kcal: input.kcal ?? null,
            alternativas: input.alternativas ?? [],
          })
          .eq("id", input.id)
          .select().single();
        if (error) throw error;
        return data as unknown as MealPlanItem;
      }
      const { data, error } = await supabase
        .from("nutrition_meal_plan_items" as any)
        .insert({
          plan_id: input.plan_id,
          dia_semana: input.dia_semana,
          momento: input.momento,
          alimento: input.alimento,
          porcion: input.porcion ?? null,
          unidad: input.unidad ?? null,
          kcal: input.kcal ?? null,
          alternativas: input.alternativas ?? [],
          orden: input.orden ?? 0,
        })
        .select().single();
      if (error) throw error;
      return data as unknown as MealPlanItem;
    },
    onSuccess: (it) => {
      qc.invalidateQueries({ queryKey: ["meal_plan_items", it.plan_id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteMealPlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await supabase.from("nutrition_meal_plan_items" as any).delete().eq("id", id);
      if (error) throw error;
      return planId;
    },
    onSuccess: (planId) => {
      qc.invalidateQueries({ queryKey: ["meal_plan_items", planId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDuplicateWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, items }: { planId: string; items: MealPlanItem[] }) => {
      if (items.length === 0) return;
      const clones = items.map((i) => ({
        plan_id: planId,
        dia_semana: i.dia_semana,
        momento: i.momento,
        alimento: i.alimento,
        porcion: i.porcion,
        unidad: i.unidad,
        kcal: i.kcal,
        alternativas: i.alternativas,
        orden: i.orden,
      }));
      const { error } = await supabase.from("nutrition_meal_plan_items" as any).insert(clones);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["meal_plan_items", v.planId] });
      toast.success("Semana duplicada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
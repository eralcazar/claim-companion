import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ConditionTipo = "cronica" | "cirugia" | "hospitalizacion" | "otra";
export type ConditionEstado = "activa" | "resuelta" | "en_control";
export interface MHCondition {
  id: string;
  patient_id: string;
  created_by: string;
  tipo: ConditionTipo;
  nombre: string;
  diagnosticado_en: string | null;
  estado: ConditionEstado;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type Parentesco =
  | "padre" | "madre" | "hermano" | "hermana"
  | "abuelo_paterno" | "abuela_paterna" | "abuelo_materno" | "abuela_materna"
  | "tio" | "tia" | "otro";
export interface MHFamily {
  id: string;
  patient_id: string;
  created_by: string;
  parentesco: Parentesco;
  condicion: string;
  edad_diagnostico: number | null;
  vive: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type AllergyTipo = "medicamento" | "alimento" | "ambiental" | "otro";
export type AllergySeveridad = "leve" | "moderada" | "severa" | "anafilaxia";
export interface MHAllergy {
  id: string;
  patient_id: string;
  created_by: string;
  sustancia: string;
  tipo: AllergyTipo;
  severidad: AllergySeveridad;
  reaccion: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface MHVaccine { nombre: string; fecha?: string | null }
export interface MHLifestyle {
  id: string;
  patient_id: string;
  created_by: string;
  tabaco: "nunca" | "exfumador" | "activo";
  tabaco_cantidad_dia: number | null;
  alcohol: "nunca" | "ocasional" | "frecuente";
  alcohol_unidades_semana: number | null;
  ejercicio: "sedentario" | "ligero" | "moderado" | "intenso";
  ejercicio_minutos_semana: number | null;
  vacunas: MHVaccine[];
  notas: string | null;
  created_at: string;
  updated_at: string;
}

function invalidate(qc: ReturnType<typeof useQueryClient>, key: string, patientId: string) {
  qc.invalidateQueries({ queryKey: [key, patientId] });
}

// ---------- Conditions ----------
export function useConditions(patientId: string | undefined) {
  return useQuery({
    queryKey: ["mh_conditions", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_history_conditions" as any)
        .select("*").eq("patient_id", patientId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MHCondition[];
    },
  });
}
export function useUpsertCondition() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<MHCondition> & { patient_id: string }) => {
      if (!user) throw new Error("No autenticado");
      const payload: any = { ...input, created_by: input.created_by ?? user.id };
      if (input.id) {
        const { error } = await supabase.from("medical_history_conditions" as any).update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medical_history_conditions" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => { invalidate(qc, "mh_conditions", v.patient_id); toast.success("Guardado"); },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}
export function useDeleteCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; patient_id: string }) => {
      const { error } = await supabase.from("medical_history_conditions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidate(qc, "mh_conditions", v.patient_id); toast.success("Eliminado"); },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

// ---------- Family ----------
export function useFamilyHistory(patientId: string | undefined) {
  return useQuery({
    queryKey: ["mh_family", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_history_family" as any)
        .select("*").eq("patient_id", patientId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MHFamily[];
    },
  });
}
export function useUpsertFamily() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<MHFamily> & { patient_id: string }) => {
      if (!user) throw new Error("No autenticado");
      const payload: any = { ...input, created_by: input.created_by ?? user.id };
      if (input.id) {
        const { error } = await supabase.from("medical_history_family" as any).update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medical_history_family" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => { invalidate(qc, "mh_family", v.patient_id); toast.success("Guardado"); },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}
export function useDeleteFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; patient_id: string }) => {
      const { error } = await supabase.from("medical_history_family" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidate(qc, "mh_family", v.patient_id); toast.success("Eliminado"); },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

// ---------- Allergies ----------
export function useAllergies(patientId: string | undefined) {
  return useQuery({
    queryKey: ["mh_allergies", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_history_allergies" as any)
        .select("*").eq("patient_id", patientId!).order("severidad", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MHAllergy[];
    },
  });
}
export function useUpsertAllergy() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<MHAllergy> & { patient_id: string }) => {
      if (!user) throw new Error("No autenticado");
      const payload: any = { ...input, created_by: input.created_by ?? user.id };
      if (input.id) {
        const { error } = await supabase.from("medical_history_allergies" as any).update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medical_history_allergies" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => { invalidate(qc, "mh_allergies", v.patient_id); toast.success("Guardado"); },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}
export function useDeleteAllergy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; patient_id: string }) => {
      const { error } = await supabase.from("medical_history_allergies" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidate(qc, "mh_allergies", v.patient_id); toast.success("Eliminado"); },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

// ---------- Lifestyle ----------
export function useLifestyle(patientId: string | undefined) {
  return useQuery({
    queryKey: ["mh_lifestyle", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_history_lifestyle" as any)
        .select("*").eq("patient_id", patientId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as MHLifestyle | null;
    },
  });
}
export function useUpsertLifestyle() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<MHLifestyle> & { patient_id: string }) => {
      if (!user) throw new Error("No autenticado");
      const payload: any = { ...input, created_by: input.created_by ?? user.id };
      const { error } = await supabase
        .from("medical_history_lifestyle" as any)
        .upsert(payload, { onConflict: "patient_id" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { invalidate(qc, "mh_lifestyle", v.patient_id); toast.success("Guardado"); },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}
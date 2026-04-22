import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface PatientPersonnelRow {
  id: string;
  patient_id: string;
  personnel_id: string;
  personnel_role: AppRole;
  granted_by: string;
  notes: string | null;
  created_at: string;
}

export interface PatientPersonnelEnriched extends PatientPersonnelRow {
  patient_name?: string;
  patient_email?: string;
  personnel_name?: string;
  personnel_email?: string;
}

async function enrichWithProfiles(rows: PatientPersonnelRow[]): Promise<PatientPersonnelEnriched[]> {
  if (rows.length === 0) return [];
  const userIds = Array.from(
    new Set(rows.flatMap((r) => [r.patient_id, r.personnel_id]))
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, first_name, paternal_surname, email")
    .in("user_id", userIds);
  const byId = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      {
        name:
          p.full_name?.trim() ||
          [p.first_name, p.paternal_surname].filter(Boolean).join(" ").trim() ||
          p.email ||
          "Sin nombre",
        email: p.email ?? "",
      },
    ])
  );
  return rows.map((r) => ({
    ...r,
    patient_name: byId.get(r.patient_id)?.name,
    patient_email: byId.get(r.patient_id)?.email,
    personnel_name: byId.get(r.personnel_id)?.name,
    personnel_email: byId.get(r.personnel_id)?.email,
  }));
}

export function useMyAccesses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patient_personnel", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_personnel")
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return enrichWithProfiles((data ?? []) as PatientPersonnelRow[]);
    },
  });
}

export function useAllAccesses() {
  return useQuery({
    queryKey: ["patient_personnel", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_personnel")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return enrichWithProfiles((data ?? []) as PatientPersonnelRow[]);
    },
  });
}

export function useAssignedPatients(role?: AppRole) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["patient_personnel", "assigned", user?.id, role ?? "any"],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("patient_personnel")
        .select("*")
        .eq("personnel_id", user!.id);
      if (role) q = q.eq("personnel_role", role);
      const { data, error } = await q;
      if (error) throw error;
      return enrichWithProfiles((data ?? []) as PatientPersonnelRow[]);
    },
  });
}

export function useGrantAccess() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      patient_id: string;
      personnel_id: string;
      personnel_role: AppRole;
      notes?: string | null;
    }) => {
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("patient_personnel").insert({
        patient_id: input.patient_id,
        personnel_id: input.personnel_id,
        personnel_role: input.personnel_role,
        granted_by: user.id,
        notes: input.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient_personnel"] });
      toast.success("Acceso otorgado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al otorgar acceso"),
  });
}

export function useRevokeAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("patient_personnel")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient_personnel"] });
      toast.success("Acceso revocado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al revocar acceso"),
  });
}

export function usePersonnelByRole(role: AppRole | "todos" | null) {
  return useQuery({
    queryKey: ["personnel-by-role", role],
    enabled: !!role,
    queryFn: async () => {
      let userIds: string[] = [];
      if (role === "todos") {
        const { data } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("role", ["medico", "enfermero", "laboratorio", "farmacia", "broker"]);
        userIds = Array.from(new Set((data ?? []).map((r) => r.user_id)));
      } else {
        const { data } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", role as AppRole);
        userIds = (data ?? []).map((r) => r.user_id);
      }
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, first_name, paternal_surname, email")
        .in("user_id", userIds);
      return (profiles ?? []).map((p) => ({
        user_id: p.user_id,
        display:
          p.full_name?.trim() ||
          [p.first_name, p.paternal_surname].filter(Boolean).join(" ").trim() ||
          p.email ||
          "Sin nombre",
        email: p.email ?? "",
      }));
    },
  });
}

export function useAllPatients() {
  return useQuery({
    queryKey: ["all-patients"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "paciente");
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, first_name, paternal_surname, email")
        .in("user_id", ids);
      return (profiles ?? []).map((p) => ({
        user_id: p.user_id,
        display:
          p.full_name?.trim() ||
          [p.first_name, p.paternal_surname].filter(Boolean).join(" ").trim() ||
          p.email ||
          "Sin nombre",
        email: p.email ?? "",
      }));
    },
  });
}
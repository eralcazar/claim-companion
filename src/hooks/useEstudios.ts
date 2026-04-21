import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Estudio = any;

interface ListFilters {
  patientId?: string;
  doctorId?: string;
  appointmentId?: string;
  estado?: string;
}

export function useEstudios(filters: ListFilters = {}) {
  return useQuery({
    queryKey: ["estudios", filters],
    queryFn: async () => {
      let q = supabase.from("estudios_solicitados").select("*").order("created_at", { ascending: false });
      if (filters.patientId) q = q.eq("patient_id", filters.patientId);
      if (filters.doctorId) q = q.eq("doctor_id", filters.doctorId);
      if (filters.appointmentId) q = q.eq("appointment_id", filters.appointmentId);
      if (filters.estado) q = q.eq("estado", filters.estado as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Estudio[];
    },
  });
}

export function useCreateEstudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Estudio>) => {
      const { data, error } = await supabase.from("estudios_solicitados").insert(input as any).select().single();
      if (error) throw error;
      if (input.patient_id) {
        await supabase.from("notifications").insert({
          user_id: input.patient_id,
          title: "Nuevo estudio solicitado",
          body: `Se ha solicitado un estudio: ${input.tipo_estudio ?? ""}`,
          link: "/estudios",
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estudios"] });
      toast.success("Estudio creado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al crear estudio"),
  });
}

export function useUpdateEstudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Estudio>) => {
      const { data, error } = await supabase.from("estudios_solicitados").update(patch as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estudios"] });
      toast.success("Estudio actualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function useDeleteEstudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("estudios_solicitados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estudios"] });
      toast.success("Estudio eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

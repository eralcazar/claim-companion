import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Receta = any;

interface ListFilters {
  patientId?: string;
  doctorId?: string;
  appointmentId?: string;
  estado?: string;
}

export function useRecetas(filters: ListFilters = {}) {
  return useQuery({
    queryKey: ["recetas", filters],
    queryFn: async () => {
      let q = supabase.from("recetas").select("*").order("created_at", { ascending: false });
      if (filters.patientId) q = q.eq("patient_id", filters.patientId);
      if (filters.doctorId) q = q.eq("doctor_id", filters.doctorId);
      if (filters.appointmentId) q = q.eq("appointment_id", filters.appointmentId);
      if (filters.estado) q = q.eq("estado", filters.estado as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Receta[];
    },
  });
}

export function useCreateReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Receta>) => {
      const { data, error } = await supabase.from("recetas").insert(input as any).select().single();
      if (error) throw error;
      // Notify patient
      if (input.patient_id) {
        await supabase.from("notifications").insert({
          user_id: input.patient_id,
          title: "Nueva receta médica",
          body: `Se ha registrado una nueva receta: ${input.medicamento_nombre ?? ""}`,
          link: "/recetas",
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recetas"] });
      toast.success("Receta creada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al crear receta"),
  });
}

export function useUpdateReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Receta>) => {
      const { data, error } = await supabase.from("recetas").update(patch as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recetas"] });
      toast.success("Receta actualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al actualizar"),
  });
}

export function useDeleteReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recetas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recetas"] });
      toast.success("Receta eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

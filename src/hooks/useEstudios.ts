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
      let q = supabase.from("estudios_solicitados").select("*, items:estudio_items(*)").order("created_at", { ascending: false });
      if (filters.patientId) q = q.eq("patient_id", filters.patientId);
      if (filters.doctorId) q = q.eq("doctor_id", filters.doctorId);
      if (filters.appointmentId) q = q.eq("appointment_id", filters.appointmentId);
      if (filters.estado) q = q.eq("estado", filters.estado as any);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      for (const r of rows) {
        if (Array.isArray(r.items)) r.items.sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0));
      }
      return rows as Estudio[];
    },
  });
}

export function useCreateEstudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Estudio> & { items?: any[] }) => {
      const { items = [], ...header } = input as any;
      // Cabecera: tomamos el tipo_estudio del primer item para compatibilidad
      const headerToInsert = { ...header };
      if (!headerToInsert.tipo_estudio && items[0]?.tipo_estudio) {
        headerToInsert.tipo_estudio = items[0].tipo_estudio;
      }
      const { data, error } = await supabase.from("estudios_solicitados").insert(headerToInsert as any).select().single();
      if (error) throw error;
      if (items.length > 0) {
        const rows = items.map((it: any, i: number) => ({
          estudio_id: data.id,
          orden: i,
          tipo_estudio: it.tipo_estudio,
          descripcion: it.descripcion || null,
          cantidad: Number(it.cantidad) || 1,
          prioridad: it.prioridad || "normal",
          indicacion: it.indicacion || null,
        }));
        const { error: ie } = await supabase.from("estudio_items").insert(rows as any);
        if (ie) throw ie;
      }
      if (header.patient_id) {
        const first = items[0]?.tipo_estudio ?? header.tipo_estudio ?? "";
        const more = items.length > 1 ? ` y ${items.length - 1} más` : "";
        await supabase.from("notifications").insert({
          user_id: header.patient_id,
          title: "Nuevo estudio solicitado",
          body: `Se ha solicitado: ${first}${more}`,
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
    mutationFn: async ({ id, items, ...patch }: { id: string; items?: any[] } & Partial<Estudio>) => {
      const headerPatch: any = { ...patch };
      if (items && items.length > 0 && !headerPatch.tipo_estudio) {
        headerPatch.tipo_estudio = items[0].tipo_estudio;
      }
      const { data, error } = await supabase.from("estudios_solicitados").update(headerPatch as any).eq("id", id).select().single();
      if (error) throw error;
      if (items) {
        const { error: de } = await supabase.from("estudio_items").delete().eq("estudio_id", id);
        if (de) throw de;
        if (items.length > 0) {
          const rows = items.map((it: any, i: number) => ({
            estudio_id: id,
            orden: i,
            tipo_estudio: it.tipo_estudio,
            descripcion: it.descripcion || null,
            cantidad: Number(it.cantidad) || 1,
            prioridad: it.prioridad || "normal",
            indicacion: it.indicacion || null,
          }));
          const { error: ie } = await supabase.from("estudio_items").insert(rows as any);
          if (ie) throw ie;
        }
      }
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

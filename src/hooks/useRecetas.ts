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
      let q = supabase
        .from("recetas")
        .select("*, items:receta_items(*)")
        .order("created_at", { ascending: false });
      if (filters.patientId) q = q.eq("patient_id", filters.patientId);
      if (filters.doctorId) q = q.eq("doctor_id", filters.doctorId);
      if (filters.appointmentId) q = q.eq("appointment_id", filters.appointmentId);
      if (filters.estado) q = q.eq("estado", filters.estado as any);
      const { data, error } = await q;
      if (error) throw error;
      const list = (data ?? []) as any[];
      // sort items by orden ascending
      list.forEach((r) => {
        if (Array.isArray(r.items)) r.items.sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0));
      });
      return list as Receta[];
    },
  });
}

export function useCreateReceta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Receta> & { items?: any[] }) => {
      const { items = [], ...header } = input as any;
      const { data, error } = await supabase.from("recetas").insert(header as any).select().single();
      if (error) throw error;
      if (items.length > 0) {
        const rows = items.map((it: any, i: number) => ({
          receta_id: data.id,
          orden: i,
          medicamento_nombre: it.medicamento_nombre,
          marca_comercial: it.marca_comercial || null,
          es_generico: !!it.es_generico,
          dosis: it.dosis === "" || it.dosis == null ? null : Number(it.dosis),
          unidad_dosis: it.unidad_dosis || null,
          cantidad: it.cantidad === "" || it.cantidad == null ? null : Number(it.cantidad),
          via_administracion: it.via_administracion || null,
          frecuencia: it.frecuencia || "cada_8h",
          frecuencia_horas: it.frecuencia === "otro" && it.frecuencia_horas ? Number(it.frecuencia_horas) : null,
          dias_a_tomar: it.dias_a_tomar === "" || it.dias_a_tomar == null ? null : Number(it.dias_a_tomar),
          precio_aproximado: it.precio_aproximado === "" || it.precio_aproximado == null ? null : Number(it.precio_aproximado),
          indicacion: it.indicacion || null,
        }));
        const { error: itemsErr } = await supabase.from("receta_items").insert(rows);
        if (itemsErr) throw itemsErr;
      }
      // Notify patient
      if (header.patient_id) {
        const first = items[0]?.medicamento_nombre ?? "";
        const extra = items.length > 1 ? ` y ${items.length - 1} más` : "";
        await supabase.from("notifications").insert({
          user_id: header.patient_id,
          title: "Nueva receta médica",
          body: `Se ha registrado una nueva receta: ${first}${extra}`,
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
    mutationFn: async ({ id, items, ...patch }: { id: string; items?: any[] } & Partial<Receta>) => {
      const { data, error } = await supabase.from("recetas").update(patch as any).eq("id", id).select().single();
      if (error) throw error;
      if (items) {
        // Replace strategy
        const { error: delErr } = await supabase.from("receta_items").delete().eq("receta_id", id);
        if (delErr) throw delErr;
        if (items.length > 0) {
          const rows = items.map((it: any, i: number) => ({
            receta_id: id,
            orden: i,
            medicamento_nombre: it.medicamento_nombre,
            marca_comercial: it.marca_comercial || null,
            es_generico: !!it.es_generico,
            dosis: it.dosis === "" || it.dosis == null ? null : Number(it.dosis),
            unidad_dosis: it.unidad_dosis || null,
            cantidad: it.cantidad === "" || it.cantidad == null ? null : Number(it.cantidad),
            via_administracion: it.via_administracion || null,
            frecuencia: it.frecuencia || "cada_8h",
            frecuencia_horas: it.frecuencia === "otro" && it.frecuencia_horas ? Number(it.frecuencia_horas) : null,
            dias_a_tomar: it.dias_a_tomar === "" || it.dias_a_tomar == null ? null : Number(it.dias_a_tomar),
            precio_aproximado: it.precio_aproximado === "" || it.precio_aproximado == null ? null : Number(it.precio_aproximado),
            indicacion: it.indicacion || null,
          }));
          const { error: insErr } = await supabase.from("receta_items").insert(rows);
          if (insErr) throw insErr;
        }
      }
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

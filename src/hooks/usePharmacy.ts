import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CatalogItem = {
  id: string;
  nombre: string;
  presentacion: string | null;
  descripcion: string | null;
  precio_centavos: number;
  moneda: string;
  activo: boolean;
};

export function useCatalog(opts: { onlyActive?: boolean; q?: string } = {}) {
  return useQuery({
    queryKey: ["pharmacy_catalog", opts],
    queryFn: async () => {
      let q = supabase.from("pharmacy_catalog").select("*").order("nombre");
      if (opts.onlyActive) q = q.eq("activo", true);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data || []) as CatalogItem[];
      if (opts.q) {
        const needle = opts.q.toLowerCase();
        rows = rows.filter((r) => r.nombre.toLowerCase().includes(needle));
      }
      return rows;
    },
  });
}

export function useUpsertCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CatalogItem> & { id?: string }) => {
      if (input.id) {
        const { error } = await supabase.from("pharmacy_catalog").update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pharmacy_catalog").insert(input as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_catalog"] });
      toast.success("Catálogo actualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pharmacy_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_catalog"] });
      toast.success("Eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePharmacyOrders(filters: { patientId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["pharmacy_orders", filters],
    queryFn: async () => {
      let q = supabase
        .from("pharmacy_orders")
        .select("*, items:pharmacy_order_items(*)")
        .order("created_at", { ascending: false });
      if (filters.patientId) q = q.eq("patient_id", filters.patientId);
      if (filters.status) q = q.eq("status", filters.status as any);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useMarkFulfilled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("pharmacy_orders")
        .update({
          status: "surtida",
          fulfilled_at: new Date().toISOString(),
          fulfilled_by: u.user?.id,
        })
        .eq("id", orderId);
      if (error) throw error;
      // Descontar inventario por cada item de la orden
      const { data: items } = await supabase
        .from("pharmacy_order_items")
        .select("catalog_id, cantidad")
        .eq("order_id", orderId);
      if (items?.length && u.user?.id) {
        const movs = items
          .filter((it: any) => it.catalog_id)
          .map((it: any) => ({
            catalog_id: it.catalog_id,
            tipo: "surtido" as const,
            cantidad: it.cantidad,
            order_id: orderId,
            motivo: "Surtido de orden",
            created_by: u.user!.id,
          }));
        if (movs.length) {
          await supabase.from("pharmacy_inventory_movements").insert(movs);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_orders"] });
      qc.invalidateQueries({ queryKey: ["pharmacy_inventory"] });
      toast.success("Marcada como surtida");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("pharmacy_orders")
        .update({ status: "cancelada" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_orders"] });
      toast.success("Orden cancelada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
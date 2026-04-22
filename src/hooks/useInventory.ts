import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type InventoryRow = {
  catalog_id: string;
  stock_actual: number;
  stock_minimo: number;
  ubicacion: string | null;
  costo_unitario_centavos: number;
  updated_at: string;
};

export type InventoryWithCatalog = InventoryRow & {
  catalog: {
    id: string;
    nombre: string;
    presentacion: string | null;
    sku: string | null;
    activo: boolean;
  };
};

export function useInventory() {
  return useQuery({
    queryKey: ["pharmacy_inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_inventory")
        .select("*, catalog:pharmacy_catalog(id, nombre, presentacion, sku, activo)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as InventoryWithCatalog[];
    },
  });
}

export function useLowStock() {
  const { data = [] } = useInventory();
  return data.filter((r) => r.stock_actual <= r.stock_minimo);
}

export function useUpsertInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<InventoryRow> & { catalog_id: string }) => {
      const { error } = await supabase
        .from("pharmacy_inventory")
        .upsert(input, { onConflict: "catalog_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_inventory"] });
      toast.success("Inventario actualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export type Movement = {
  id: string;
  catalog_id: string;
  tipo: "entrada" | "salida" | "surtido" | "ajuste";
  cantidad: number;
  motivo: string | null;
  order_id: string | null;
  created_by: string;
  created_at: string;
};

export function useMovements(filter: { catalogId?: string; tipo?: string } = {}) {
  return useQuery({
    queryKey: ["inventory_movements", filter],
    queryFn: async () => {
      let q = supabase
        .from("pharmacy_inventory_movements")
        .select("*, catalog:pharmacy_catalog(nombre, sku)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (filter.catalogId) q = q.eq("catalog_id", filter.catalogId);
      if (filter.tipo) q = q.eq("tipo", filter.tipo as any);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      catalog_id: string;
      tipo: "entrada" | "salida" | "surtido" | "ajuste";
      cantidad: number;
      motivo?: string;
      order_id?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No autenticado");
      const { error } = await supabase.from("pharmacy_inventory_movements").insert({
        ...input,
        created_by: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast.success("Movimiento registrado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
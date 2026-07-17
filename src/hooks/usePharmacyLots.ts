import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type Lot = {
  id: string;
  catalog_id: string;
  branch_id: string;
  lote: string;
  caducidad: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  costo_unitario_centavos: number;
  proveedor_id: string | null;
  purchase_id: string | null;
  ubicacion: string | null;
  estado: "activo" | "agotado" | "vencido" | "bloqueado";
  fecha_ingreso: string;
  notas: string | null;
  created_at: string;
};

export type LotWithCatalog = Lot & {
  catalog: { id: string; nombre: string; presentación: string | null; sku: string | null };
};

export function useLots(opts: { branchId?: string | null; catalogId?: string; estado?: string } = {}) {
  return useQuery({
    queryKey: ["pharmacy_lots", opts],
    queryFn: async () => {
      let q = supabase
        .from("pharmacy_lots")
        .select(`*, catalog:pharmacy_catalog(id,nombre,"presentación",sku)`)
        .order("caducidad", { ascending: true });
      if (opts.branchId) q = q.eq("branch_id", opts.branchId);
      if (opts.catalogId) q = q.eq("catalog_id", opts.catalogId);
      if (opts.estado) q = q.eq("estado", opts.estado);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as LotWithCatalog[];
    },
    enabled: opts.branchId !== null,
  });
}

export function useUpsertLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<Lot> & { catalog_id: string; branch_id: string; lote: string; caducidad: string; cantidad_inicial: number; cantidad_actual: number }) => {
      const { data: u } = await supabase.auth.getUser();
      const payload = { ...row, created_by: row.id ? undefined : u.user?.id };
      const { data, error } = await supabase.from("pharmacy_lots").upsert(payload as any).select().single();
      if (error) throw error;
      return data as Lot;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_lots"] });
      qc.invalidateQueries({ queryKey: ["pharmacy_rotation"] });
      toast({ title: "Lote guardado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useLotMovements(lotId?: string) {
  return useQuery({
    queryKey: ["pharmacy_lot_movements", lotId],
    queryFn: async () => {
      if (!lotId) return [];
      const { data, error } = await supabase
        .from("pharmacy_lot_movements")
        .select("*")
        .eq("lot_id", lotId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!lotId,
  });
}

export function useCreateLotMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: {
      lot_id: string;
      catalog_id: string;
      branch_id: string;
      tipo: "entrada" | "salida" | "ajuste" | "merma" | "traspaso" | "caducidad";
      cantidad: number;
      motivo?: string;
      costo_unitario_centavos?: number;
      referencia_tipo?: string;
      referencia_id?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("pharmacy_lot_movements")
        .insert({ ...m, created_by: u.user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_lots"] });
      qc.invalidateQueries({ queryKey: ["pharmacy_lot_movements"] });
      qc.invalidateQueries({ queryKey: ["pharmacy_rotation"] });
      toast({ title: "Movimiento registrado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export type RotationAlert = {
  lot_id: string;
  catalog_id: string;
  producto_nombre: string;
  branch_id: string;
  lote: string;
  caducidad: string;
  dias_a_caducar: number;
  cantidad_actual: number;
  alerta: string;
  severidad: "critico" | "alto" | "medio" | "bajo" | "ninguno";
};

export function useRotationAlerts(branchId?: string | null) {
  return useQuery({
    queryKey: ["pharmacy_rotation", branchId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pharmacy_lots_rotation_alerts", {
        _branch_id: branchId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as RotationAlert[];
    },
    enabled: branchId !== null,
  });
}

export function useSugerirFEFO(catalogId?: string, branchId?: string | null, cantidad?: number) {
  return useQuery({
    queryKey: ["pharmacy_fefo", catalogId, branchId, cantidad],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sugerir_lotes_fefo", {
        _catalog_id: catalogId!,
        _branch_id: branchId!,
        _cantidad: cantidad!,
      });
      if (error) throw error;
      return (data ?? []) as Array<{
        lot_id: string;
        lote: string;
        caducidad: string;
        cantidad_disponible: number;
        cantidad_a_tomar: number;
        costo_unitario_centavos: number;
      }>;
    },
    enabled: !!catalogId && !!branchId && !!cantidad && cantidad > 0,
  });
}
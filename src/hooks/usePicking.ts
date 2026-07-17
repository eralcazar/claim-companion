import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PickingAssignment = {
  item_id: string;
  catalog_id: string;
  cantidad_requerida: number;
  splits: { lot_id: string; cantidad: number }[];
};

export async function logPickingAudit(
  order_id: string,
  action: "start" | "scan" | "confirm" | "revert" | "scan_reject",
  payload?: Record<string, unknown>
) {
  const { data: u } = await supabase.auth.getUser();
  const actor_id = u.user?.id;
  if (!actor_id) return;
  await supabase.from("pharmacy_picking_audit").insert([
    { order_id, actor_id, action, payload: (payload ?? null) as any },
  ]);
}

export function useConfirmPicking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      order_id: string;
      branch_id: string;
      assignments: PickingAssignment[];
    }) => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Sin sesión");

      // Validate totals
      for (const a of input.assignments) {
        const total = a.splits.reduce((s, x) => s + (x.cantidad || 0), 0);
        if (total !== a.cantidad_requerida) {
          throw new Error(
            `Cantidad asignada (${total}) no coincide con la requerida (${a.cantidad_requerida}).`
          );
        }
        for (const s of a.splits) {
          if (!s.lot_id) throw new Error("Todos los renglones deben tener lote asignado.");
          if (s.cantidad <= 0) throw new Error("Las cantidades deben ser mayores a cero.");
        }
      }

      // 1) Create lot movements (trigger decrements pharmacy_lots)
      const movs = input.assignments.flatMap((a) =>
        a.splits.map((s) => ({
          lot_id: s.lot_id,
          catalog_id: a.catalog_id,
          branch_id: input.branch_id,
          tipo: "salida" as const,
          cantidad: s.cantidad,
          motivo: "Surtido de orden",
          referencia_tipo: "pharmacy_order",
          referencia_id: input.order_id,
          created_by: userId,
        }))
      );
      if (movs.length) {
        const { error: movErr } = await supabase.from("pharmacy_lot_movements").insert(movs);
        if (movErr) throw movErr;
      }

      // 2) Update each item with primary lot (first split)
      for (const a of input.assignments) {
        const primary = a.splits[0]?.lot_id;
        if (primary) {
          await supabase
            .from("pharmacy_order_items")
            .update({ lote_id: primary })
            .eq("id", a.item_id);
        }
      }

      // 3) Mark order as surtida
      const { error: ordErr } = await supabase
        .from("pharmacy_orders")
        .update({
          status: "surtida",
          fulfilled_at: new Date().toISOString(),
          fulfilled_by: userId,
        })
        .eq("id", input.order_id);
      if (ordErr) throw ordErr;

      await logPickingAudit(input.order_id, "confirm", {
        assignments: input.assignments,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_orders"] });
      qc.invalidateQueries({ queryKey: ["pharmacy_lots"] });
      qc.invalidateQueries({ queryKey: ["pharmacy_rotation"] });
      toast.success("Orden surtida");
    },
    onError: (e: any) => toast.error(e?.message || "No se pudo surtir"),
  });
}

/**
 * Revierte un surtido confirmado: genera movimientos de entrada correctivos
 * por cada salida original y regresa la orden a status "pagada".
 */
export function useRevertPicking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { order_id: string; motivo: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Sin sesión");

      // Buscar movimientos originales de salida ligados a la orden
      const { data: movs, error: movErr } = await supabase
        .from("pharmacy_lot_movements")
        .select("id, lot_id, catalog_id, branch_id, cantidad, tipo, referencia_tipo, referencia_id")
        .eq("referencia_tipo", "pharmacy_order")
        .eq("referencia_id", input.order_id)
        .eq("tipo", "salida");
      if (movErr) throw movErr;
      if (!movs || movs.length === 0) {
        throw new Error("No hay movimientos de salida para revertir.");
      }

      // Crear movimientos correctivos de entrada
      const correcciones = movs.map((m) => ({
        lot_id: m.lot_id,
        catalog_id: m.catalog_id,
        branch_id: m.branch_id,
        tipo: "entrada" as const,
        cantidad: m.cantidad,
        motivo: `Reverso surtido: ${input.motivo}`,
        referencia_tipo: "pharmacy_order_revert",
        referencia_id: input.order_id,
        created_by: userId,
      }));
      const { error: insErr } = await supabase
        .from("pharmacy_lot_movements")
        .insert(correcciones);
      if (insErr) throw insErr;

      // Regresar orden a pagada
      const { error: ordErr } = await supabase
        .from("pharmacy_orders")
        .update({
          status: "pagada",
          fulfilled_at: null,
          fulfilled_by: null,
        })
        .eq("id", input.order_id);
      if (ordErr) throw ordErr;

      await logPickingAudit(input.order_id, "revert", {
        motivo: input.motivo,
        movimientos_revertidos: movs.length,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacy_orders"] });
      qc.invalidateQueries({ queryKey: ["pharmacy_lots"] });
      qc.invalidateQueries({ queryKey: ["pharmacy_rotation"] });
      toast.success("Surtido revertido; inventario restaurado.");
    },
    onError: (e: any) => toast.error(e?.message || "No se pudo revertir"),
  });
}

export function usePickingAudit(order_id: string | null) {
  return useMutation({
    mutationFn: async () => order_id,
  });
}
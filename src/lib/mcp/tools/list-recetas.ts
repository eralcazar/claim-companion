import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_recetas",
  title: "Listar recetas",
  description: "Lista recetas visibles para el usuario (paciente ve las suyas; médico las que emitió). RLS aplica.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Máximo de recetas (default 20)"),
    patient_id: z.string().uuid().optional().describe("Filtrar por paciente (opcional)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, patient_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("recetas")
      .select("id,folio,patient_id,doctor_id,diagnostico,fecha_emision,estatus,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (patient_id) q = q.eq("patient_id", patient_id);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
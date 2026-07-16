import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_estudios",
  title: "Estudios solicitados",
  description: "Lista estudios de laboratorio/gabinete solicitados visibles para el usuario.",
  inputSchema: {
    status: z.string().optional(),
    patient_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, patient_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let q = supabaseForUser(ctx)
      .from("estudios_solicitados")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("estatus", status);
    if (patient_id) q = q.eq("patient_id", patient_id);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
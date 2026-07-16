import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "get_receta",
  title: "Obtener receta",
  description: "Devuelve la cabecera de una receta y todos sus renglones (medicamentos).",
  inputSchema: {
    receta_id: z.string().uuid().describe("ID de la receta"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ receta_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const [{ data: receta, error: rErr }, { data: items, error: iErr }] = await Promise.all([
      sb.from("recetas").select("*").eq("id", receta_id).maybeSingle(),
      sb.from("receta_items").select("*").eq("receta_id", receta_id),
    ]);
    if (rErr) return errorResult(rErr.message);
    if (iErr) return errorResult(iErr.message);
    if (!receta) return errorResult("Receta no encontrada");
    return jsonResult({ receta, items });
  },
});
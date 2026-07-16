import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_pharmacy_catalog",
  title: "Catálogo de farmacia",
  description: "Lista SKUs del catálogo de farmacia (nombre, presentación, precio, categoría).",
  inputSchema: {
    q: z.string().optional().describe("Búsqueda por nombre"),
    only_active: z.boolean().optional().describe("Solo activos (default true)"),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ q, only_active, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    let query = supabaseForUser(ctx)
      .from("pharmacy_catalog")
      .select("id,sku,nombre,presentacion,categoria,precio_centavos,moneda,activo")
      .order("nombre")
      .limit(limit ?? 50);
    if (only_active !== false) query = query.eq("activo", true);
    if (q) query = query.ilike("nombre", `%${q}%`);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
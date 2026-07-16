import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "list_pharmacy_inventory",
  title: "Inventario de farmacia",
  description: "Devuelve el stock actual por SKU. Útil para integraciones con ERP.",
  inputSchema: {
    limit: z.number().int().min(1).max(500).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("pharmacy_inventory")
      .select("catalog_id,stock_actual,stock_minimo,updated_at,catalog:pharmacy_catalog(sku,nombre,presentacion)")
      .limit(limit ?? 100);
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
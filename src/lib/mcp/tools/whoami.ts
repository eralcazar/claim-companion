import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauthenticated, jsonResult, errorResult } from "../supabase";

export default defineTool({
  name: "whoami",
  title: "Quién soy",
  description: "Devuelve el perfil, rol activo y roles del usuario conectado en CareCentral.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const [{ data: profile, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      sb.from("profiles").select("full_name,email,active_role").eq("user_id", userId).maybeSingle(),
      sb.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (pErr) return errorResult(pErr.message);
    if (rErr) return errorResult(rErr.message);
    return jsonResult({
      user_id: userId,
      email: ctx.getUserEmail() ?? profile?.email,
      full_name: profile?.full_name,
      active_role: profile?.active_role,
      roles: (roles ?? []).map((r) => r.role),
    });
  },
});
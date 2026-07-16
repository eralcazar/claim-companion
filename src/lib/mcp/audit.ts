import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

/**
 * Server-side audit client (service role). Only used to append rows to
 * `mcp_tool_call_logs`; never returned to the caller and never used to read
 * data owned by users.
 */
function auditClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Build a redacted summary of the tool input: only the top-level keys and a
 * primitive type/length hint per key. Never persist raw values (they can carry
 * patient identifiers, IDs pasted from an assistant, free text, etc.).
 */
function summarizeParams(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v == null) {
      out[k] = { type: "null" };
    } else if (typeof v === "string") {
      out[k] = { type: "string", length: v.length };
    } else if (typeof v === "number" || typeof v === "boolean") {
      out[k] = { type: typeof v };
    } else if (Array.isArray(v)) {
      out[k] = { type: "array", length: v.length };
    } else {
      out[k] = { type: "object", keys: Object.keys(v as object).length };
    }
  }
  return out;
}

type ToolDescriptor = {
  name: string;
  handler: (input: any, ctx: ToolContext) => any;
  [k: string]: unknown;
};

/**
 * Wraps a tool descriptor so every invocation is recorded in
 * `mcp_tool_call_logs`. Failures to log are swallowed so audit never breaks a
 * legitimate tool call.
 */
export function withAudit<T extends ToolDescriptor>(tool: T): T {
  const original = tool.handler;
  const wrapped = async (input: any, ctx: ToolContext) => {
    const started = Date.now();
    let status: "ok" | "error" = "ok";
    let errorMessage: string | undefined;
    let result: unknown;
    try {
      result = await original(input, ctx);
      const isErr = !!(result && typeof result === "object" && (result as any).isError);
      if (isErr) status = "error";
      return result;
    } catch (e: any) {
      status = "error";
      errorMessage = e?.message ?? String(e);
      throw e;
    } finally {
      const ms = Date.now() - started;
      try {
        const sb = auditClient();
        if (sb) {
          await sb.from("mcp_tool_call_logs").insert({
            user_id: ctx.isAuthenticated() ? ctx.getUserId() : null,
            user_email: ctx.isAuthenticated() ? ctx.getUserEmail() ?? null : null,
            client_id: ctx.isAuthenticated() ? ctx.getClientId() ?? null : null,
            tool_name: tool.name,
            params_summary: summarizeParams(input),
            status,
            error: errorMessage ?? null,
            duration_ms: ms,
          });
        }
      } catch {
        // audit best-effort
      }
    }
  };
  return { ...tool, handler: wrapped };
}
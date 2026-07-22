import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECRETS = [
  "GEMINI_API_KEY",
  "MISTRAL_API_KEY",
  "ANTHROPIC_API_KEY",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: claims.claims.sub,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const status = SECRETS.map((name) => {
      const value = Deno.env.get(name);
      const configured = !!value && value.length > 0;
      return {
        name,
        configured,
        length: configured ? value!.length : 0,
        preview: configured ? `${value!.slice(0, 4)}…${value!.slice(-4)}` : null,
      };
    });

    // Enriquecer con últimas acciones desde ai_api_key_audit
    const { data: auditRows } = await admin
      .from("ai_api_key_audit")
      .select("secret_name, action, created_at, latency_ms, error_message, actor_email")
      .in("secret_name", SECRETS)
      .order("created_at", { ascending: false })
      .limit(200);

    const lastByName: Record<string, any> = {};
    const lastTestByName: Record<string, any> = {};
    for (const r of auditRows ?? []) {
      if (!lastByName[r.secret_name]) lastByName[r.secret_name] = r;
      if (
        !lastTestByName[r.secret_name] &&
        (r.action === "test_success" || r.action === "test_failed")
      ) {
        lastTestByName[r.secret_name] = r;
      }
    }

    const enriched = status.map((s) => ({
      ...s,
      last_action: lastByName[s.name]?.action ?? null,
      last_action_at: lastByName[s.name]?.created_at ?? null,
      last_actor_email: lastByName[s.name]?.actor_email ?? null,
      last_test_status: lastTestByName[s.name]?.action ?? null,
      last_test_at: lastTestByName[s.name]?.created_at ?? null,
      last_test_latency_ms: lastTestByName[s.name]?.latency_ms ?? null,
      last_test_error: lastTestByName[s.name]?.error_message ?? null,
    }));

    return json({ secrets: enriched, checked_at: new Date().toISOString() });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
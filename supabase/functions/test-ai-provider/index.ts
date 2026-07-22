import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVIDER_MAP: Record<string, { secret: string; label: string }> = {
  gemini: { secret: "GEMINI_API_KEY", label: "Google Gemini" },
  mistral: { secret: "MISTRAL_API_KEY", label: "Mistral AI" },
  claude: { secret: "ANTHROPIC_API_KEY", label: "Anthropic Claude" },
};

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
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string | undefined) ?? null;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { provider } = await req.json().catch(() => ({}));
    const meta = PROVIDER_MAP[provider];
    if (!meta) return json({ error: "Proveedor no soportado" }, 400);

    const apiKey = Deno.env.get(meta.secret);
    if (!apiKey) {
      await admin.from("ai_api_key_audit").insert({
        secret_name: meta.secret,
        action: "test_failed",
        actor_user_id: userId,
        actor_email: userEmail,
        error_message: "API key no configurada",
      });
      return json({ ok: false, error: `${meta.secret} no configurada` }, 400);
    }

    // Cargar endpoint + default_model del proveedor
    const { data: prov } = await admin
      .from("ai_external_providers")
      .select("endpoint, default_model, models, activo")
      .eq("id", provider)
      .maybeSingle();
    if (!prov) return json({ error: "Proveedor no registrado" }, 404);

    const model =
      prov.default_model ||
      (Array.isArray(prov.models) && prov.models[0]?.id) ||
      "";
    if (!model) return json({ error: "Sin modelos configurados" }, 400);

    const t0 = performance.now();
    let ok = false;
    let status = 0;
    let errMsg: string | null = null;
    try {
      const resp = await fetch(prov.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      status = resp.status;
      ok = resp.ok;
      if (!resp.ok) errMsg = (await resp.text().catch(() => "")).slice(0, 500);
    } catch (e: any) {
      errMsg = e?.message ?? "network_error";
    }
    const latency = Math.round(performance.now() - t0);

    await admin.from("ai_api_key_audit").insert({
      secret_name: meta.secret,
      action: ok ? "test_success" : "test_failed",
      actor_user_id: userId,
      actor_email: userEmail,
      preview: `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`,
      length: apiKey.length,
      latency_ms: latency,
      model_used: model,
      error_message: errMsg,
      note: `HTTP ${status}`,
    });

    return json({
      ok,
      provider,
      model_used: model,
      latency_ms: latency,
      http_status: status,
      error_message: errMsg,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
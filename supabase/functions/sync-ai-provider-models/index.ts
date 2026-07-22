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

type ModelRow = { id: string; label: string };

async function fetchGemini(apiKey: string): Promise<ModelRow[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const j = await resp.json();
  const models = Array.isArray(j?.models) ? j.models : [];
  return models
    .filter((m: any) =>
      Array.isArray(m?.supportedGenerationMethods) &&
      m.supportedGenerationMethods.includes("generateContent") &&
      typeof m?.name === "string" &&
      m.name.startsWith("models/gemini-"),
    )
    .map((m: any) => {
      // OpenAI-compat endpoint espera "google/<id>"; Gemini nombre = "models/gemini-…"
      const bare = String(m.name).replace(/^models\//, "");
      return {
        id: `google/${bare}`,
        label: `${m.displayName ?? bare}`,
      } as ModelRow;
    })
    .sort((a: ModelRow, b: ModelRow) => a.id.localeCompare(b.id));
}

async function fetchMistral(apiKey: string): Promise<ModelRow[]> {
  const resp = await fetch("https://api.mistral.ai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) throw new Error(`Mistral ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const j = await resp.json();
  const data = Array.isArray(j?.data) ? j.data : [];
  return data
    .filter((m: any) => typeof m?.id === "string")
    .map((m: any) => ({
      id: m.id,
      label: m?.name ?? m.id,
    }))
    .sort((a: ModelRow, b: ModelRow) => a.id.localeCompare(b.id));
}

async function fetchClaude(apiKey: string): Promise<ModelRow[]> {
  const resp = await fetch("https://api.anthropic.com/v1/models?limit=1000", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!resp.ok) throw new Error(`Claude ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const j = await resp.json();
  const data = Array.isArray(j?.data) ? j.data : [];
  return data
    .filter((m: any) => typeof m?.id === "string")
    .map((m: any) => ({
      id: m.id,
      label: m?.display_name ?? m.id,
    }))
    .sort((a: ModelRow, b: ModelRow) => b.id.localeCompare(a.id));
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
    if (!apiKey) return json({ ok: false, error: `${meta.secret} no configurada` }, 400);

    const { data: prov } = await admin
      .from("ai_external_providers")
      .select("default_model, models")
      .eq("id", provider)
      .maybeSingle();
    if (!prov) return json({ error: "Proveedor no registrado" }, 404);

    const t0 = performance.now();
    let models: ModelRow[] = [];
    let errMsg: string | null = null;
    try {
      if (provider === "gemini") models = await fetchGemini(apiKey);
      else if (provider === "mistral") models = await fetchMistral(apiKey);
      else if (provider === "claude") models = await fetchClaude(apiKey);
    } catch (e: any) {
      errMsg = (e?.message ?? "network_error").slice(0, 500);
    }
    const latency = Math.round(performance.now() - t0);

    if (errMsg || models.length === 0) {
      await admin.from("ai_api_key_audit").insert({
        secret_name: meta.secret,
        action: "models_sync_failed",
        actor_user_id: userId,
        actor_email: userEmail,
        latency_ms: latency,
        error_message: errMsg ?? "Catálogo vacío",
        note: `provider=${provider}`,
      });
      return json({ ok: false, error: errMsg ?? "Catálogo vacío", latency_ms: latency }, 502);
    }

    // Preserva default_model si sigue disponible; si no, elige el primero.
    const ids = new Set(models.map((m) => m.id));
    const nextDefault = prov.default_model && ids.has(prov.default_model)
      ? prov.default_model
      : models[0].id;

    const { error: updErr } = await admin
      .from("ai_external_providers")
      .update({
        models: models as any,
        default_model: nextDefault,
        updated_at: new Date().toISOString(),
      })
      .eq("id", provider);

    if (updErr) {
      return json({ ok: false, error: updErr.message }, 500);
    }

    await admin.from("ai_api_key_audit").insert({
      secret_name: meta.secret,
      action: "models_synced",
      actor_user_id: userId,
      actor_email: userEmail,
      latency_ms: latency,
      model_used: nextDefault,
      note: `${models.length} modelos`,
    });

    return json({
      ok: true,
      provider,
      count: models.length,
      default_model: nextDefault,
      models,
      latency_ms: latency,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
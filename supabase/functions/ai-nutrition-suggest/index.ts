// Sugerencias nutricionales personalizadas con RAG y referencias.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  loadPolicy, callGateway, retrieveKnowledge, buildRagContext, normalizeReferences,
  routeExternalOrFallback, dispatchExternalProvider, recordAiAudit, rerankKnowledge,
} from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "Method not allowed" }, 405);
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return j({ error: "IA no configurada" }, 500);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "No autorizado" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return j({ error: "Sesión inválida" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const goal: string = (body?.goal ?? "").toString().trim().slice(0, 500);
    const restrictions: string = (body?.restrictions ?? "").toString().trim().slice(0, 1000);
    const patientId: string | null = body?.patient_id ?? null;
    if (!goal) return j({ error: "Describe el objetivo" }, 400);

    const policy = await loadPolicy(admin, "nutrition_suggestions");

    // Contexto de RAG
    let refBlock = { context: "", references: [] as any[] };
    if (policy.rag_enabled) {
      let matches = await retrieveKnowledge(admin, LOVABLE_API_KEY, `${goal} ${restrictions}`, {
        count: policy.rerank_enabled ? (policy.rerank_top_n ?? 30) : (policy.rerank_keep ?? 6),
        minSimilarity: 0.55,
        categories: policy.rag_categories?.length ? policy.rag_categories : null,
      });
      if (policy.rerank_enabled && matches.length > (policy.rerank_keep ?? 6)) {
        matches = await rerankKnowledge(LOVABLE_API_KEY, `${goal} ${restrictions}`, matches, policy.rerank_keep ?? 6);
      }
      refBlock = buildRagContext(matches);
    }

    const system = `Eres un nutriólogo clínico de CareCentral. Responde en español (México), tono profesional y claro, con recomendaciones prácticas.
- Considera las restricciones y alergias del paciente.
- Si citas una fuente disponible, usa el token [[ref:<id>]] al final de la oración.
- No prescribas medicamentos ni interpretes laboratorios en profundidad.
- Estructura: Objetivo → Plan sugerido (macros aproximadas, ejemplos de comidas) → Precauciones → Próximos pasos.`;

    const userMsg = `${refBlock.context ? refBlock.context + "\n\n" : ""}Objetivo: ${goal}\nRestricciones/alergias/condiciones: ${restrictions || "(ninguna reportada)"}${patientId ? `\nPaciente ID: ${patientId}` : ""}`;

    const messages = [{ role: "system", content: system }, { role: "user", content: userMsg }];

    const external = async () => {
      const r = await dispatchExternalProvider(policy.provider || "lovable", policy.external_endpoint || "", policy.model, messages, { maxOutputTokens: policy.max_output_tokens });
      return { content: r.content, status: r.ok ? "ok" : `err_${r.status}` };
    };
    const fallback = async () => {
      const r = await callGateway(LOVABLE_API_KEY, "google/gemini-3-flash-preview", messages, { maxOutputTokens: policy.max_output_tokens });
      return { content: r.content, status: r.ok ? "ok" : `err_${r.status}` };
    };

    let raw = "";
    if ((policy.provider ?? "lovable") === "lovable") {
      raw = (await fallback()).content;
      await recordAiAudit(admin, {
        userId: userData.user.id, featureKey: "nutrition_suggestions", provider: "lovable", model: policy.model,
        sanitized: false, sanitizationNotes: null, sanitizedPrompt: null, piiFieldsDetected: [], fallbackUsed: false,
        status: raw ? "ok" : "empty", blockedReason: null, consentChecked: false,
        inputChars: userMsg.length, outputChars: raw.length, latencyMs: null,
      });
    } else {
      const routed = await routeExternalOrFallback({
        admin, userId: userData.user.id, featureKey: "nutrition_suggestions",
        provider: policy.provider!, model: policy.model, rawUserPrompt: userMsg, external, fallback,
      });
      raw = routed.content;
    }
    if (!raw) return j({ error: "Sin respuesta del proveedor" }, 502);

    const norm = normalizeReferences(raw, refBlock.references);

    // Auditar referencias
    try {
      await admin.from("ai_provider_audit").update({
        references_count: norm.references.length,
        references_ids: norm.references.map((r) => r.id),
        rerank_used: !!policy.rerank_enabled,
      }).eq("feature_key", "nutrition_suggestions")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(1);
    } catch { /* ignore */ }

    return j({ text: norm.text, references: norm.references });
  } catch (e) {
    console.error("ai-nutrition-suggest error", e);
    return j({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
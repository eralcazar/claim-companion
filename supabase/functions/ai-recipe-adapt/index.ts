// Adaptación de recetas por IA con RAG y citas.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  loadPolicy, callGateway, retrieveKnowledge, buildRagContext, normalizeReferences, rerankKnowledge,
  routeExternalOrFallback, dispatchExternalProvider, recordAiAudit,
} from "../_shared/ai-router.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
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
    const recipe = body?.recipe;
    const restrictions: string = (body?.restrictions ?? "").toString().slice(0, 800);
    if (!recipe?.title) return j({ error: "Receta requerida" }, 400);

    const policy = await loadPolicy(admin, "recipe_adapt");
    const query = `${recipe.title} ${restrictions}`;
    let refBlock = { context: "", references: [] as any[] };
    if (policy.rag_enabled) {
      let matches = await retrieveKnowledge(admin, LOVABLE_API_KEY, query, {
        count: policy.rerank_top_n ?? 20, minSimilarity: 0.55,
        categories: policy.rag_categories?.length ? policy.rag_categories : null,
      });
      if (policy.rerank_enabled && matches.length > (policy.rerank_keep ?? 5)) {
        matches = await rerankKnowledge(LOVABLE_API_KEY, query, matches, policy.rerank_keep ?? 5);
      }
      refBlock = buildRagContext(matches);
    }

    const system = `Eres un nutriólogo clínico. Adapta la receta a las restricciones del paciente.
Devuelve un texto con: sustituciones (motivo), ingredientes ajustados, pasos ajustados y precauciones.
Cita fuentes con [[ref:<id>]] al final de la oración cuando uses una fuente disponible.`;

    const userMsg = `${refBlock.context ? refBlock.context + "\n\n" : ""}Receta original: ${recipe.title}
Ingredientes: ${JSON.stringify(recipe.ingredients ?? [])}
Pasos: ${JSON.stringify(recipe.steps ?? [])}
Restricciones/alergias: ${restrictions || "(ninguna)"}`;

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
        userId: userData.user.id, featureKey: "recipe_adapt", provider: "lovable", model: policy.model,
        sanitized: false, sanitizationNotes: null, sanitizedPrompt: null, piiFieldsDetected: [], fallbackUsed: false,
        status: raw ? "ok" : "empty", blockedReason: null, consentChecked: false,
        inputChars: userMsg.length, outputChars: raw.length, latencyMs: null,
      });
    } else {
      const routed = await routeExternalOrFallback({
        admin, userId: userData.user.id, featureKey: "recipe_adapt",
        provider: policy.provider!, model: policy.model, rawUserPrompt: userMsg, external, fallback,
      });
      raw = routed.content;
    }
    if (!raw) return j({ error: "Sin respuesta" }, 502);
    const norm = normalizeReferences(raw, refBlock.references);
    return j({ text: norm.text, references: norm.references });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
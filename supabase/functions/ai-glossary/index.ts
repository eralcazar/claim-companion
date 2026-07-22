// Edge function: glosario educativo médico. Rechaza cualquier prompt con contexto personal.
// Usa ApiFreeLLM cuando la política lo indica (con fallback automático a Lovable AI).
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  loadPolicy,
  callGateway,
  callApiFreeLLM,
  routeExternalOrFallback,
  normalizePrompt,
  isCacheableGeneric,
  hashPrompt,
  lookupCache,
  saveCache,
} from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un divulgador médico de CareCentral. Responde en español de México, tono cálido y claro, en 3-6 oraciones.
Reglas:
- Solo información educativa general (definiciones, "para qué sirve", cómo funciona algo, síntomas típicos).
- NO diagnósticas, NO recomiendes dosis, NO interpretes datos del paciente.
- Si la pregunta parece pedir diagnóstico, dosis personalizada, o interpretación de un caso, responde exactamente:
  "Esta pregunta requiere valoración médica personalizada. Consulta a Kari o a tu médico."
- No inventes marcas comerciales ni cifras específicas.
- Sin markdown, sin listas largas.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "No autorizado" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "IA no configurada" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return jsonResponse({ error: "Sesión inválida" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => null);
    const question = (body?.question ?? "").toString().trim();
    if (!question) return jsonResponse({ error: "Pregunta vacía" }, 400);
    if (question.length > 500) {
      return jsonResponse({ error: "Pregunta demasiado larga (máx 500 caracteres).", code: "too_long" }, 400);
    }

    // ── Gate estricto: sólo preguntas educativas genéricas
    const normalized = normalizePrompt(question);
    if (!isCacheableGeneric(question, normalized)) {
      return jsonResponse(
        {
          error: "Esta pregunta parece incluir datos personales o un caso específico. Usa Kari en el chat.",
          code: "not_generic",
        },
        400,
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const policy = await loadPolicy(admin, "glossary");
    const MODEL = policy.model || "gpt-3.5-turbo";
    const provider = policy.provider ?? "lovable";

    // ── Caché: TTL largo porque las definiciones cambian poco
    const promptHash = await hashPrompt(normalized);
    if (policy.enable_cache) {
      const hit = await lookupCache(admin, "glossary", promptHash);
      if (hit) {
        return jsonResponse({
          answer: hit.response,
          provider: "cache",
          model: hit.model,
          cached: true,
          fallback_used: false,
        });
      }
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ];

    // Modelos por proveedor: cuando cae a fallback Lovable, usa Gemini Flash Lite.
    const externalModel = MODEL;
    const fallbackModel = "google/gemini-2.5-flash-lite";

    const external = async () => {
      const endpoint = policy.external_endpoint || "https://apifreellm.com/api/chat/completions";
      const r = await callApiFreeLLM(endpoint, externalModel, messages, {
        maxOutputTokens: policy.max_output_tokens,
      });
      if (!r.ok) return { content: "", status: `apifreellm_${r.status}` };
      return { content: r.content, status: "ok" };
    };

    const fallback = async () => {
      const r = await callGateway(LOVABLE_API_KEY, fallbackModel, messages, {
        maxOutputTokens: policy.max_output_tokens,
      });
      if (!r.ok) return { content: "", status: `lovable_${r.status}` };
      return { content: r.content, status: "ok" };
    };

    let content = "";
    let providerUsed = provider;
    let fallbackUsed = false;
    let blockedReason: string | null = null;

    if (provider === "lovable") {
      const r = await fallback();
      content = r.content;
      providerUsed = "lovable";
    } else {
      const routed = await routeExternalOrFallback({
        admin,
        userId: user.id,
        featureKey: "glossary",
        provider,
        model: externalModel,
        rawUserPrompt: question,
        external,
        fallback,
        requireGeneric: true,
      });
      content = routed.content;
      providerUsed = routed.provider;
      fallbackUsed = routed.fallbackUsed;
      blockedReason = routed.blockedReason;
    }

    if (!content) {
      return jsonResponse({ error: "Sin respuesta del proveedor de IA", code: "empty_response" }, 502);
    }

    if (policy.enable_cache) {
      await saveCache(
        admin,
        "glossary",
        promptHash,
        normalized,
        content,
        providerUsed === "lovable" ? fallbackModel : externalModel,
        Math.ceil(content.length / 3),
        policy.cache_ttl_hours,
      );
    }

    return jsonResponse({
      answer: content,
      provider: providerUsed,
      model: providerUsed === "lovable" ? fallbackModel : externalModel,
      cached: false,
      fallback_used: fallbackUsed,
      blocked_reason: blockedReason,
    });
  } catch (e) {
    console.error("ai-glossary error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
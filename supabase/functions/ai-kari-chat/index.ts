// Edge function: chat médico con Kari (Lovable AI Gateway + descuento de tokens).
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  loadPolicy,
  normalizePrompt,
  hashPrompt,
  isCacheableGeneric,
  lookupCache,
  saveCache,
  callGateway,
  pruneHistory,
  truncateText,
  MODEL_COSTS,
} from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// System prompt compacto (~200 tokens vs ~500 anterior). Conserva reglas de seguridad.
const SYSTEM_PROMPT = `Eres Kari, asistente de salud de CareCentral. Español de México, cálida y clara.
REGLAS:
- NO eres médico: no diagnosticas, no prescribes, no ajustas dosis.
- Emergencia (dolor torácico intenso, disnea, pérdida de conciencia, sangrado abundante, signos de infarto/ACV, ideación suicida): responde PRIMERO con "⚠️ Esto puede ser una emergencia. Llama al 911 o acude a urgencias."
- Ante síntomas significativos, recomienda ver a un profesional.
- Recuerda que no sustituyes consulta médica.
PUEDES: explicar términos, orientar cuándo buscar atención, describir medicamentos en general, dar consejos de bienestar, ayudar con la app.
Sé breve (≤5 párrafos) salvo que pidan detalle. Sin markdown pesado.`;

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
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "Servicio de IA no configurado" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse({ error: "Sesión inválida" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => null);
    const message = (body?.message ?? "").toString().trim();
    if (!message) return jsonResponse({ error: "Mensaje vacío" }, 400);
    if (message.length > 4000) return jsonResponse({ error: "Mensaje demasiado largo (máx 4000)" }, 400);
    let conversationId: string | null = body?.conversation_id ?? null;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Cargar política del feature "kari_chat"
    const policy = await loadPolicy(admin, "kari_chat");
    const ACTIVE_MODEL = policy.model;

    // Verificar límite mensual por rol/paquete
    const { data: limitInfo } = await admin.rpc("check_kari_monthly_limit", { _user_id: user.id });
    const limit = (limitInfo ?? {}) as { allowed?: boolean; cap?: number | null; used?: number; resets_at?: string };
    if (limit && limit.allowed === false) {
      return jsonResponse(
        {
          error: "Has alcanzado el tope mensual de tokens de tu paquete.",
          code: "monthly_limit_reached",
          cap: limit.cap,
          used: limit.used,
          resets_at: limit.resets_at,
        },
        429,
      );
    }

    // Verificar saldo
    const { data: balanceRow } = await admin
      .from("ai_token_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    const balance = balanceRow?.balance ?? 0;
    if (balance <= 0) {
      return jsonResponse(
        { error: "Sin tokens de IA. Compra un paquete para seguir conversando con Kari.", code: "insufficient_tokens", balance: 0 },
        402,
      );
    }

    // Truncar mensaje muy largo
    const trimmedMessage = truncateText(message, 2000);

    // Crear conversación si no hay
    if (!conversationId) {
      const title = trimmedMessage.slice(0, 60);
      const { data: conv, error: cErr } = await admin
        .from("ai_chat_conversations")
        .insert({ user_id: user.id, title })
        .select("id")
        .single();
      if (cErr) throw cErr;
      conversationId = conv.id;
    } else {
      // Validar dueño
      const { data: conv } = await admin
        .from("ai_chat_conversations")
        .select("user_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conv || conv.user_id !== user.id) {
        return jsonResponse({ error: "Conversación no encontrada" }, 404);
      }
    }

    // Cargar historial reciente (más ancho porque después podamos)
    const { data: rawHistory } = await admin
      .from("ai_chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(40);

    // Insertar mensaje del usuario
    await admin.from("ai_chat_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: trimmedMessage,
      tokens_used: 0,
    });

    // === Intento de caché para preguntas educativas genéricas (solo si no hay historial personal) ===
    const historyList = rawHistory ?? [];
    const normalized = normalizePrompt(trimmedMessage);
    const cacheable =
      policy.enable_cache &&
      historyList.length === 0 && // primera pregunta del hilo
      isCacheableGeneric(trimmedMessage, normalized);

    let assistantContent = "";
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let servedFromCache = false;
    let usedModel = ACTIVE_MODEL;
    let gatewayRunId: string | null = null;
    let gatewayLogId: string | null = null;
    const promptHash = cacheable ? await hashPrompt(normalized) : "";

    if (cacheable) {
      const hit = await lookupCache(admin, "kari_chat", promptHash);
      if (hit) {
        assistantContent = hit.response;
        usedModel = hit.model;
        servedFromCache = true;
        // Tokens = 0 al cachear (no consumimos gateway ni descontamos al usuario)
      }
    }

    if (!servedFromCache) {
      // Podar historial: mantener últimos `policy.history_window`; resumir el resto
      const prunedHistory = await pruneHistory(
        LOVABLE_API_KEY,
        historyList.map((m) => ({ role: m.role as string, content: m.content as string })),
        policy.history_window,
      );

      const messagesToSend = [
        { role: "system", content: SYSTEM_PROMPT },
        ...prunedHistory,
        { role: "user", content: trimmedMessage },
      ];

      const aiResp = await callGateway(LOVABLE_API_KEY, ACTIVE_MODEL, messagesToSend, {
        maxOutputTokens: policy.max_output_tokens,
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return jsonResponse({ error: "Kari está saturada. Intenta en unos segundos.", code: "rate_limited" }, 429);
        }
        if (aiResp.status === 402) {
          return jsonResponse({ error: "Sin créditos del servicio de IA. Avisa al admin.", code: "ai_credits" }, 402);
        }
        console.error("AI gateway error:", aiResp.status, aiResp.rawText);
        return jsonResponse({ error: "Error del servicio de IA" }, 502);
      }

      assistantContent = aiResp.content;
      promptTokens = aiResp.usage.prompt_tokens || Math.ceil(trimmedMessage.length / 3);
      completionTokens = aiResp.usage.completion_tokens || Math.ceil(assistantContent.length / 3);
      totalTokens = aiResp.usage.total_tokens || promptTokens + completionTokens;
      gatewayRunId = (aiResp as any)?.gatewayRunId ?? null;
      gatewayLogId = (aiResp as any)?.gatewayLogId ?? null;

      // Guardar en caché si aplicaba
      if (cacheable && assistantContent) {
        await saveCache(
          admin,
          "kari_chat",
          promptHash,
          normalized,
          assistantContent,
          ACTIVE_MODEL,
          totalTokens,
          policy.cache_ttl_hours,
        );
      }
    }

    const cost = MODEL_COSTS[usedModel] ?? { input: 0, output: 0 };
    const costMicros = promptTokens * cost.input + completionTokens * cost.output;

    // Guardar respuesta del asistente
    const { data: insertedMsg } = await admin.from("ai_chat_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: assistantContent,
      tokens_used: totalTokens,
    }).select("id").maybeSingle();

    // Log granular de uso
    await admin.from("ai_token_usage_log").insert({
      user_id: user.id,
      conversation_id: conversationId,
      message_id: insertedMsg?.id ?? null,
      model: servedFromCache ? `${usedModel} (cache)` : usedModel,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost_usd_micros: costMicros,
      feature_key: "kari-chat",
      gateway_run_id: gatewayRunId,
      gateway_log_id: gatewayLogId,
    });

    // Consumir tokens (0 si es cache hit)
    const consume = Math.min(totalTokens, balance);
    if (consume > 0) {
      await admin.rpc("consume_ai_tokens", { _user_id: user.id, _tokens: consume });
    }

    // Tocar updated_at de la conversación
    await admin
      .from("ai_chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return jsonResponse({
      conversation_id: conversationId,
      assistant: assistantContent,
      tokens_used: totalTokens,
      remaining: balance - consume,
      low_balance: balance - consume > 0 && balance - consume < 500,
      cached: servedFromCache,
      model: usedModel,
      monthly_used: limit?.used != null ? (limit.used as number) + totalTokens : undefined,
      monthly_cap: limit?.cap ?? undefined,
      monthly_resets_at: limit?.resets_at,
    });
  } catch (e) {
    console.error("ai-kari-chat error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
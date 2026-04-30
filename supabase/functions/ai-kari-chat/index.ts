// Edge function: chat médico con Kari (Lovable AI Gateway + descuento de tokens).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres Kari, asistente de salud digital de CareCentral. Hablas español de México de forma cálida, clara y respetuosa.

REGLAS CRÍTICAS DE SEGURIDAD:
- NO eres médico. NO diagnosticas, NO prescribes medicamentos, NO ajustas dosis ni tratamientos.
- Si detectas señales de EMERGENCIA (dolor torácico intenso, dificultad para respirar, pérdida de conciencia, sangrado abundante, signos de infarto o ACV, ideación suicida) responde PRIMERO con:
  "⚠️ Esto puede ser una emergencia. Llama al 911 o acude a urgencias inmediatamente."
- Ante síntomas significativos, recomienda consultar a un profesional médico.
- Recuérdale al usuario que esto NO sustituye una consulta médica.

QUÉ PUEDES HACER:
- Explicar términos médicos y resultados de estudios en lenguaje simple.
- Orientar sobre cuándo buscar atención médica.
- Ayudar a entender medicamentos (qué son, para qué se usan en general) sin recomendar dosis.
- Dar consejos generales de bienestar (sueño, alimentación, ejercicio).
- Ayudar a navegar la app CareCentral.

Si la pregunta es completamente fuera del ámbito de salud, redirige amablemente.
Sé breve por defecto (máx ~5 párrafos) salvo que el usuario pida detalle.`;

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

    // Crear conversación si no hay
    if (!conversationId) {
      const title = message.slice(0, 60);
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

    // Cargar historial reciente
    const { data: history } = await admin
      .from("ai_chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Insertar mensaje del usuario
    await admin.from("ai_chat_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: message,
      tokens_used: 0,
    });

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (aiResp.status === 429) {
      return jsonResponse({ error: "Kari está saturada. Intenta en unos segundos.", code: "rate_limited" }, 429);
    }
    if (aiResp.status === 402) {
      return jsonResponse({ error: "Sin créditos del servicio de IA. Avisa al admin.", code: "ai_credits" }, 402);
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return jsonResponse({ error: "Error del servicio de IA" }, 502);
    }

    const aiJson = await aiResp.json();
    const assistantContent: string = aiJson?.choices?.[0]?.message?.content ?? "";
    const totalTokens: number = Number(aiJson?.usage?.total_tokens) || Math.ceil((message.length + assistantContent.length) / 3);

    // Guardar respuesta del asistente
    await admin.from("ai_chat_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: assistantContent,
      tokens_used: totalTokens,
    });

    // Consumir tokens (usa min(saldo, totalTokens) para no fallar si excede)
    const consume = Math.min(totalTokens, balance);
    await admin.rpc("consume_ai_tokens", { _user_id: user.id, _tokens: consume });

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
    });
  } catch (e) {
    console.error("ai-kari-chat error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
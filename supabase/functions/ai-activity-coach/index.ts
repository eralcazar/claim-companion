// Edge function: coach de actividad física con Lovable AI + descuento de tokens.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3-flash-preview";
const COST = { input: 30, output: 250 }; // micro-USD por token

const SYSTEM_PROMPT = `Eres un coach de actividad física de CareCentral. Hablas español de México, cálido y claro.

Tu tarea: analizar los datos de actividad, frecuencia cardiaca, sueño y condiciones médicas del paciente y devolver una respuesta JSON con:
- summary: 2-3 oraciones sobre cómo va la actividad del paciente.
- red_flags: lista de banderas rojas clínicas detectadas (HTA no controlada, SpO2 bajo, taquicardia en reposo, sedentarismo severo, etc.). Puede estar vacía.
- recommendations: lista de 3-5 recomendaciones específicas y accionables (tipo, motivo, prioridad low/medium/high).
- suggested_plan: opcional. Si el paciente se beneficiaría de un plan estructurado, propón uno con name, objective, level, days_per_week, y sessions[] (day_of_week 0-6, title, duration_min, intensity, exercises[] con name, muscle_group, sets, reps, duration_seconds, rest_seconds, equipment).

REGLAS DE SEGURIDAD:
- NO diagnósticas, NO prescribes medicamentos.
- Si detectas HTA no controlada, dolor torácico, SpO2 <92%, o síntomas de emergencia, marca red_flag high y recomienda consulta médica ANTES de ejercicio intenso.
- Adapta la intensidad al nivel del paciente y a sus condiciones (rehabilitación, edad avanzada, embarazo, etc.).
- Máximo 6 ejercicios por sesión.

Responde SOLO con JSON válido, sin markdown, sin explicaciones fuera del JSON.`;

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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verificar saldo de tokens Kari
    const { data: bal } = await admin
      .from("ai_token_balances")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    const balance = bal?.balance ?? 0;
    if (balance <= 0) {
      return jsonResponse(
        { error: "Sin tokens de IA. Compra un paquete para generar sugerencias.", code: "insufficient_tokens" },
        402,
      );
    }

    // Reunir contexto de últimos 14 días
    const since = new Date(Date.now() - 14 * 86400_000).toISOString();
    const sinceDate = since.slice(0, 10);

    const [activityRes, hrRes, spo2Res, bpRes, logsRes, condRes, goalsRes] = await Promise.all([
      admin.from("activity_readings").select("fecha, steps, sleep_minutes").eq("patient_id", user.id).gte("fecha", sinceDate).order("fecha", { ascending: false }).limit(30),
      admin.from("heart_rate_readings").select("bpm, measured_at").eq("patient_id", user.id).gte("measured_at", since).order("measured_at", { ascending: false }).limit(100),
      admin.from("spo2_readings").select("spo2, taken_at").eq("patient_id", user.id).gte("taken_at", since).order("taken_at", { ascending: false }).limit(30),
      admin.from("blood_pressure_readings").select("systolic, diastolic, taken_at").eq("patient_id", user.id).gte("taken_at", since).order("taken_at", { ascending: false }).limit(30),
      admin.from("workout_logs").select("fecha, completed, rpe, duration_min").eq("patient_id", user.id).gte("fecha", sinceDate).order("fecha", { ascending: false }).limit(30),
      admin.from("medical_history_conditions").select("condition_name, status").eq("user_id", user.id).limit(20),
      admin.from("activity_goals").select("*").eq("patient_id", user.id).maybeSingle(),
    ]);

    const stepsAvg = (activityRes.data ?? []).length
      ? Math.round((activityRes.data ?? []).reduce((s, r: any) => s + (r.steps ?? 0), 0) / (activityRes.data ?? []).length)
      : 0;
    const sleepAvg = (activityRes.data ?? []).length
      ? Math.round((activityRes.data ?? []).reduce((s, r: any) => s + (r.sleep_minutes ?? 0), 0) / (activityRes.data ?? []).length)
      : 0;
    const hrAvg = (hrRes.data ?? []).length
      ? Math.round((hrRes.data ?? []).reduce((s, r: any) => s + (r.bpm ?? 0), 0) / (hrRes.data ?? []).length)
      : 0;
    const spo2Avg = (spo2Res.data ?? []).length
      ? Math.round((spo2Res.data ?? []).reduce((s, r: any) => s + (r.spo2 ?? 0), 0) / (spo2Res.data ?? []).length)
      : 0;
    const bpLast = (bpRes.data ?? [])[0];
    const workoutsCompleted = (logsRes.data ?? []).filter((l: any) => l.completed).length;
    const conditions = (condRes.data ?? []).map((c: any) => c.condition_name).join(", ") || "ninguna registrada";

    const contextMsg = `Contexto del paciente (últimos 14 días):
- Promedio de pasos por día: ${stepsAvg}
- Promedio de sueño por día (min): ${sleepAvg}
- Frecuencia cardiaca promedio: ${hrAvg} bpm
- SpO2 promedio: ${spo2Avg}%
- Última presión arterial: ${bpLast ? `${bpLast.systolic}/${bpLast.diastolic} mmHg` : "no registrada"}
- Entrenamientos completados: ${workoutsCompleted}
- Condiciones activas: ${conditions}
- Metas actuales: pasos ${goalsRes.data?.steps_goal ?? 8000}, min activos ${goalsRes.data?.active_minutes_goal ?? 30}, sueño min ${goalsRes.data?.sleep_minutes_goal ?? 420}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contextMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) return jsonResponse({ error: "IA saturada. Intenta en unos segundos.", code: "rate_limited" }, 429);
    if (aiResp.status === 402) return jsonResponse({ error: "Créditos IA agotados.", code: "ai_credits" }, 402);
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return jsonResponse({ error: "Error del servicio de IA" }, 502);
    }

    const aiJson = await aiResp.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content };
    }

    const promptTokens = Number(aiJson?.usage?.prompt_tokens) || Math.ceil(contextMsg.length / 3);
    const completionTokens = Number(aiJson?.usage?.completion_tokens) || Math.ceil(content.length / 3);
    const totalTokens = Number(aiJson?.usage?.total_tokens) || promptTokens + completionTokens;
    const costMicros = promptTokens * COST.input + completionTokens * COST.output;

    const { data: inserted } = await admin
      .from("activity_ai_suggestions")
      .insert({
        patient_id: user.id,
        summary: parsed.summary ?? null,
        red_flags: parsed.red_flags ?? [],
        recommendations: parsed.recommendations ?? [],
        suggested_plan: parsed.suggested_plan ?? null,
        model: MODEL,
        tokens_used: totalTokens,
      })
      .select("id")
      .maybeSingle();

    await admin.from("ai_token_usage_log").insert({
      user_id: user.id,
      conversation_id: null,
      message_id: null,
      model: MODEL,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost_usd_micros: costMicros,
    });

    const consume = Math.min(totalTokens, balance);
    await admin.rpc("consume_ai_tokens", { _user_id: user.id, _tokens: consume });

    return jsonResponse({
      id: inserted?.id,
      ...parsed,
      tokens_used: totalTokens,
      remaining: balance - consume,
    });
  } catch (e) {
    console.error("ai-activity-coach error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
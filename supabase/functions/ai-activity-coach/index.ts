// Edge function: coach de actividad física con Lovable AI + descuento de tokens.
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadPolicy, callGateway, callApiFreeLLM, routeExternalOrFallback, MODEL_COSTS } from "../_shared/ai-router.ts";

// Categoriza condiciones médicas en buckets genéricos NO identificables.
// Usado sólo cuando la política envía datos a un proveedor externo.
function bucketizeConditions(names: string[]): string[] {
  const buckets = new Set<string>();
  for (const raw of names) {
    const n = (raw || "").toLowerCase();
    if (/(hiperten|cardio|infart|arritm|coron|isquem|angina)/.test(n)) buckets.add("cardiovascular");
    else if (/(diabet|obesid|metab|tiroid|colester|dislipid)/.test(n)) buckets.add("metabolico");
    else if (/(asma|epoc|apnea|respirator|pulmon|bronqu)/.test(n)) buckets.add("respiratorio");
    else buckets.add("otro");
  }
  return Array.from(buckets);
}

function bucketSteps(n: number): string { return n < 3000 ? "bajo" : n < 7500 ? "medio" : "alto"; }
function bucketHr(n: number): string { return !n ? "sin_dato" : n < 60 ? "bajo" : n <= 90 ? "normal" : "elevado"; }
function bucketSpo2(n: number): string { return !n ? "sin_dato" : n < 92 ? "bajo" : n < 95 ? "limite" : "normal"; }
function bucketBp(sys: number, dia: number): string {
  if (!sys) return "sin_dato";
  if (sys >= 140 || dia >= 90) return "elevada";
  if (sys >= 130 || dia >= 85) return "limite";
  return "normal";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

const SYSTEM_PROMPT = `Eres un coach de actividad física de CareCentral. Hablas español de México, cálido y claro.

Tu tarea: analizar los datos de actividad, frecuencia cardiaca, sueño y condiciones médicas del paciente y devolver una respuesta JSON con:
- summary: 2-3 oraciones sobre cómo va la actividad del paciente.
- red_flags: lista de banderas rojas clínicas detectadas (HTA no controlada, SpO2 bajo, taquicardia en reposo, sedentarismo severo, etc.). Puede estar vacía.
- recommendations: lista de 3-5 recomendaciones específicas y accionables. Cada una debe tener: text (qué hacer, concreto y medible), reason (por qué, citando el dato del paciente: pasos, HR, SpO2, BP), priority (low|medium|high), expected_impact (objeto con metric = steps|hr_resting|bp_systolic|spo2|sleep_min|weight, delta_estimate = string breve tipo "+1500 pasos/día" o "-5 mmHg en 4 semanas", horizon_weeks = número).
- thresholds: objeto opcional con alertas sugeridas basadas en umbrales para el paciente { spo2_min, bp_systolic_max, bp_diastolic_max, hr_resting_max } — usá valores conservadores según sus condiciones.
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
    const policy = await loadPolicy(admin, "activity_coach");
    const MODEL = policy.model || DEFAULT_MODEL;
    const COST = MODEL_COSTS[MODEL] ?? { input: 10, output: 80 };
    const providerCfg = policy.provider ?? "lovable";

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
    const conditionNames = (condRes.data ?? []).map((c: any) => c.condition_name).filter(Boolean);
    const conditionsFull = conditionNames.join(", ") || "ninguna registrada";
    const conditionBuckets = bucketizeConditions(conditionNames);

    // Prompt detallado (con valores exactos y nombres de condiciones) — SOLO para Lovable AI interno.
    const contextMsgDetailed = `Contexto del paciente (últimos 14 días):
- Promedio de pasos por día: ${stepsAvg}
- Promedio de sueño por día (min): ${sleepAvg}
- Frecuencia cardiaca promedio: ${hrAvg} bpm
- SpO2 promedio: ${spo2Avg}%
- Última presión arterial: ${bpLast ? `${bpLast.systolic}/${bpLast.diastolic} mmHg` : "no registrada"}
- Entrenamientos completados: ${workoutsCompleted}
- Condiciones activas: ${conditionsFull}
- Metas actuales: pasos ${goalsRes.data?.steps_goal ?? 8000}, min activos ${goalsRes.data?.active_minutes_goal ?? 30}, sueño min ${goalsRes.data?.sleep_minutes_goal ?? 420}`;

    // Prompt des-identificado (buckets categóricos, sin nombres de patologías) — para proveedor externo.
    const contextMsgGeneric = `Perfil de actividad genérico (últimos 14 días):
- Actividad diaria: ${bucketSteps(stepsAvg)} (${stepsAvg} pasos promedio)
- Sueño diario: ${sleepAvg < 360 ? "bajo" : sleepAvg < 480 ? "normal" : "alto"}
- Frecuencia cardiaca en reposo: ${bucketHr(hrAvg)}
- Saturación de oxígeno: ${bucketSpo2(spo2Avg)}
- Presión arterial: ${bucketBp(bpLast?.systolic ?? 0, bpLast?.diastolic ?? 0)}
- Entrenamientos completados en 14 días: ${workoutsCompleted}
- Categorías clínicas activas: ${conditionBuckets.length ? conditionBuckets.join(", ") : "ninguna"}
- Nivel objetivo de actividad diaria: ${goalsRes.data?.steps_goal ?? 8000} pasos`;

    // Si la política apunta a un proveedor externo, orquesta con governance + fallback.
    // Si es lovable, llamada directa con el prompt detallado (comportamiento previo).
    let content = "";
    let providerUsed = providerCfg;
    let fallbackUsed = false;

    if (providerCfg !== "lovable") {
      const external = async () => {
        const endpoint = policy.external_endpoint || "https://apifreellm.com/api/chat/completions";
        const r = await callApiFreeLLM(endpoint, MODEL, [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contextMsgGeneric },
        ], { maxOutputTokens: policy.max_output_tokens, responseFormat: "json_object" });
        return { content: r.ok ? r.content : "", status: r.ok ? "ok" : `apifreellm_${r.status}` };
      };
      const fallback = async () => {
        const r = await callGateway(LOVABLE_API_KEY, "google/gemini-2.5-flash-lite", [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contextMsgDetailed },
        ], { maxOutputTokens: policy.max_output_tokens, responseFormat: "json_object" });
        return { content: r.ok ? r.content : "", status: r.ok ? "ok" : `lovable_${r.status}` };
      };
      const routed = await routeExternalOrFallback({
        admin,
        userId: user.id,
        featureKey: "activity_coach",
        provider: providerCfg,
        model: MODEL,
        rawUserPrompt: contextMsgGeneric,
        external,
        fallback,
      });
      content = routed.content || "{}";
      providerUsed = routed.provider;
      fallbackUsed = routed.fallbackUsed;
    } else {
      const aiResp = await callGateway(
        LOVABLE_API_KEY,
        MODEL,
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: contextMsgDetailed },
        ],
        { maxOutputTokens: policy.max_output_tokens, responseFormat: "json_object" },
      );
      if (!aiResp.ok) {
        if (aiResp.status === 429) return jsonResponse({ error: "IA saturada. Intenta en unos segundos.", code: "rate_limited" }, 429);
        if (aiResp.status === 402) return jsonResponse({ error: "Créditos IA agotados.", code: "ai_credits" }, 402);
        console.error("AI gateway error", aiResp.status, aiResp.rawText);
        return jsonResponse({ error: "Error del servicio de IA" }, 502);
      }
      content = aiResp.content || "{}";
    }
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: content };
    }

    const usedGeneric = providerUsed !== "lovable" && !fallbackUsed;
    const contextForCount = usedGeneric ? contextMsgGeneric : contextMsgDetailed;
    const promptTokens = Math.ceil(contextForCount.length / 3);
    const completionTokens = Math.ceil(content.length / 3);
    const totalTokens = promptTokens + completionTokens;
    // Cuando el proveedor externo respondió (gratis), no cobramos costo micros al usuario.
    const costMicros = usedGeneric ? 0 : promptTokens * COST.input + completionTokens * COST.output;

    const { data: inserted } = await admin
      .from("activity_ai_suggestions")
      .insert({
        patient_id: user.id,
        summary: parsed.summary ?? null,
        red_flags: parsed.red_flags ?? [],
        recommendations: parsed.recommendations ?? [],
        suggested_plan: parsed.suggested_plan ?? null,
        model: usedGeneric ? MODEL : "google/gemini-2.5-flash-lite",
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

    const consume = usedGeneric ? 0 : Math.min(totalTokens, balance);
    await admin.rpc("consume_ai_tokens", { _user_id: user.id, _tokens: consume });

    return jsonResponse({
      id: inserted?.id,
      ...parsed,
      tokens_used: totalTokens,
      remaining: balance - consume,
      provider: providerUsed,
      fallback_used: fallbackUsed,
    });
  } catch (e) {
    console.error("ai-activity-coach error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
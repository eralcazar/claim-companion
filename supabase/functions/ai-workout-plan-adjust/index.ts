// Ajusta un plan existente con base en las últimas semanas de historial.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

const SYSTEM = `Eres un entrenador. Recibes el plan actual y el historial reciente del atleta.
Devuelves SOLO JSON válido con ajustes recomendados (no reescribas todo el plan; solo lo que cambiaría):
{
  "summary": "1-2 oraciones sobre cómo va el ciclo.",
  "flags": ["señal de alerta 1"],
  "adjustments": [
    { "day_of_week": 1, "exercise_id": "<uuid>", "action": "increase_weight|decrease_weight|add_set|remove_set|swap|keep|deload",
      "delta_kg": 2.5, "delta_reps": 0, "swap_for_exercise_id": null, "reason": "por qué" }
  ],
  "next_week_focus": "Recomendación semanal general"
}
Reglas:
- Si hay RPE >=9 sostenido o molestias reportadas: prioriza deload o mantener.
- Si hay progreso consistente y RPE <=7: sube ligeramente (linear +2.5kg upper / +5kg lower).
- Español de México.`;

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

    const body = await req.json();
    const planId = body?.plan_id as string | undefined;
    if (!planId) return j({ error: "plan_id requerido" }, 400);

    const { data: plan } = await admin.from("workout_plans").select("*").eq("id", planId).eq("patient_id", userData.user.id).maybeSingle();
    if (!plan) return j({ error: "Plan no encontrado" }, 404);

    const { data: sessions } = await admin.from("workout_sessions").select("id, day_of_week, title").eq("plan_id", planId);
    const sessionIds = (sessions ?? []).map((s: any) => s.id);
    const { data: planExercises } = sessionIds.length
      ? await admin.from("workout_exercises").select("session_id, exercise_id, sets, reps, rest_sec").in("session_id", sessionIds)
      : { data: [] as any[] };

    // Historial últimas 3 semanas
    const since = new Date(); since.setDate(since.getDate() - 21);
    const { data: logs } = await admin.from("exercise_session_logs")
      .select("id, fecha, rpe, discomforts, warmup_notes, session_rest_sec")
      .eq("patient_id", userData.user.id)
      .gte("fecha", since.toISOString().slice(0, 10));
    const logIds = (logs ?? []).map((l: any) => l.id);
    const { data: sets } = logIds.length
      ? await admin.from("exercise_set_logs").select("session_log_id, exercise_id, reps, weight_kg, rpe").in("session_log_id", logIds)
      : { data: [] as any[] };

    // Nombres para el prompt
    const exIds = new Set<string>();
    (planExercises ?? []).forEach((e: any) => exIds.add(e.exercise_id));
    (sets ?? []).forEach((s: any) => exIds.add(s.exercise_id));
    const { data: catalog } = exIds.size
      ? await admin.from("exercise_catalog").select("id, name, muscle_group").in("id", Array.from(exIds))
      : { data: [] as any[] };
    const nameOf = new Map((catalog ?? []).map((c: any) => [c.id, c.name]));

    const planText = (sessions ?? []).map((s: any) => {
      const exs = (planExercises ?? []).filter((e: any) => e.session_id === s.id)
        .map((e: any) => `  - ${nameOf.get(e.exercise_id) ?? e.exercise_id} [${e.exercise_id}] : ${e.sets}x${e.reps ?? "-"} r${e.rest_sec ?? "-"}s`).join("\n");
      return `Día ${s.day_of_week + 1} — ${s.title}\n${exs}`;
    }).join("\n\n");

    const logText = (logs ?? []).slice(-15).map((l: any) => {
      const ls = (sets ?? []).filter((x: any) => x.session_log_id === l.id)
        .map((x: any) => `${nameOf.get(x.exercise_id) ?? x.exercise_id}: ${x.reps ?? "-"}reps@${x.weight_kg ?? "-"}kg RPE${x.rpe ?? "-"}`).join("; ");
      return `${l.fecha} RPE=${l.rpe ?? "-"} molestias=${l.discomforts ?? "-"} → ${ls}`;
    }).join("\n");

    const userPrompt = `PLAN ACTUAL (objetivo=${plan.objective}, semana ${plan.current_week}/${plan.weeks}, esquema=${plan.progression_scheme}):
${planText || "(vacío)"}

HISTORIAL ÚLTIMAS 3 SEMANAS:
${logText || "(sin sesiones recientes)"}

Devuelve JSON con ajustes puntuales. Solo usa exercise_id que aparezcan en el plan.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      if (r.status === 429) return j({ error: "Muchas solicitudes" }, 429);
      if (r.status === 402) return j({ error: "Créditos de IA agotados" }, 402);
      return j({ error: "Gateway falló" }, 502);
    }
    const data = await r.json();
    let parsed: any = {};
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    return j({
      summary: parsed.summary ?? "",
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      adjustments: Array.isArray(parsed.adjustments) ? parsed.adjustments : [],
      next_week_focus: parsed.next_week_focus ?? "",
    });
  } catch (e: any) {
    return j({ error: e.message ?? "error" }, 500);
  }
});
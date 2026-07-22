// Genera un plan semanal de entrenamiento estructurado.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

const SYSTEM = `Eres un entrenador. Diseñas un plan semanal con ejercicios del catálogo entregado.
Devuelves SOLO JSON válido:
{
  "name": "Nombre corto del plan",
  "notes": "Resumen y consejos generales, 2-3 oraciones.",
  "days": [
    { "day_of_week": 1, "title": "Empuje", "intensity": "moderada", "duration_min": 60,
      "exercises": [ { "exercise_id": "<uuid>", "sets": 3, "reps": 8, "rest_sec": 90, "notes": "" } ] }
  ]
}
Reglas:
- day_of_week: 1=Lun ... 7=Dom. Solo genera tantos días como pida el usuario.
- Usa EXACTAMENTE los exercise_id del catálogo entregado; no inventes ids.
- Prescribe sets/reps/descanso según objetivo (fuerza 3-5x3-6, hipertrofia 3-4x8-12, resistencia 2-3x12-20, pérdida 3x10-15 con menor descanso).
- Considera el equipo disponible.
Español de México.`;

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
    const {
      objective = "mantenimiento",
      level = "principiante",
      days_per_week = 3,
      weeks = 4,
      progression_scheme = "linear",
      equipment = [],
      environment = "gym",
      notes = "",
    } = body ?? {};

    // Catálogo relevante (limitar tamaño)
    const { data: catalog } = await admin
      .from("exercise_catalog")
      .select("id, name, category, muscle_group, equipment, metric_type, environment")
      .or(`environment.eq.${environment},environment.eq.ambos`)
      .limit(120);

    const catText = (catalog ?? []).map((c: any) =>
      `${c.id} | ${c.name} | ${c.category} | ${c.muscle_group ?? "-"} | ${c.equipment ?? "-"} | ${c.metric_type}`).join("\n");

    const userPrompt = `Objetivo: ${objective}
Nivel: ${level}
Días por semana: ${days_per_week}
Semanas: ${weeks}
Progresión: ${progression_scheme}
Entorno: ${environment}
Equipo disponible: ${(equipment ?? []).join(", ") || "peso corporal"}
Notas del usuario: ${notes || "(ninguna)"}

Catálogo (id | nombre | categoría | grupo | equipo | métrica):
${catText}

Devuelve el JSON.`;

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
      const t = await r.text();
      if (r.status === 429) return j({ error: "Muchas solicitudes, intenta luego" }, 429);
      if (r.status === 402) return j({ error: "Créditos de IA agotados" }, 402);
      return j({ error: "Gateway falló", detail: t }, 502);
    }
    const data = await r.json();
    let parsed: any = {};
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { parsed = {}; }

    if (!Array.isArray(parsed?.days) || parsed.days.length === 0) {
      return j({ error: "La IA no devolvió días válidos", raw: parsed }, 502);
    }

    // Persistir
    const { data: plan, error: pe } = await admin.from("workout_plans").insert({
      patient_id: userData.user.id,
      created_by: userData.user.id,
      name: parsed.name || `Plan ${objective}`,
      objective,
      level,
      days_per_week,
      weeks,
      progression_scheme,
      current_week: 1,
      equipment: equipment ?? [],
      notes: parsed.notes ?? notes ?? null,
      is_active: true,
      ai_generated: true,
    }).select("id").single();
    if (pe) return j({ error: pe.message }, 500);
    const planId = plan.id;

    const validIds = new Set((catalog ?? []).map((c: any) => c.id));
    for (const day of parsed.days) {
      const { data: sess, error: sErr } = await admin.from("workout_sessions").insert({
        plan_id: planId,
        day_of_week: Math.min(6, Math.max(0, Number(day.day_of_week ?? 1) - 1)),
        orden: 0,
        title: day.title ?? `Día ${day.day_of_week}`,
        duration_min: day.duration_min ?? null,
        intensity: day.intensity ?? null,
        notes: day.notes ?? null,
      }).select("id").single();
      if (sErr) continue;
      const exRows = (day.exercises ?? [])
        .filter((e: any) => validIds.has(e.exercise_id))
        .map((e: any, i: number) => ({
          session_id: sess.id,
          exercise_id: e.exercise_id,
          orden: i,
          sets: e.sets ?? 3,
          reps: e.reps ?? null,
          rest_sec: e.rest_sec ?? null,
          notes: e.notes ?? null,
        }));
      if (exRows.length) await admin.from("workout_exercises").insert(exRows);
    }

    return j({ ok: true, plan_id: planId, name: parsed.name, notes: parsed.notes });
  } catch (e: any) {
    return j({ error: e.message ?? "error" }, 500);
  }
});
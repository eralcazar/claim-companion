// Coach IA para progresión de ejercicios específicos. Recibe historial numérico
// de sets de un ejercicio y devuelve sugerencia estructurada.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Eres un entrenador experto que ayuda a progresar en ejercicios individuales.
Recibes datos numéricos anónimos (sin nombre, sin condiciones médicas). Devuelves SOLO JSON válido con:
{
  "summary": "1-2 oraciones sobre cómo va la progresión.",
  "progression": "Recomendación concreta para la próxima sesión (peso/reps/distancia/tiempo).",
  "next_target": "Objetivo corto y medible (ej: '3x8 con 60kg').",
  "cues": ["consejo técnico 1", "consejo técnico 2"]
}
Español de México. No diagnósticas. Si los datos son insuficientes, sugiere una progresión conservadora.`;

const SESSION_SUMMARY_PROMPT = `Eres un entrenador experto. Analizas una sesión completa (varios ejercicios) y las notas del atleta (RPE, calentamiento, molestias, descanso). Devuelves SOLO JSON válido con:
{
  "summary": "1-2 oraciones sobre cómo salió la sesión.",
  "highlights": ["logro concreto 1", "logro concreto 2"],
  "flags": ["señal a cuidar 1", "señal a cuidar 2"],
  "next_session": "Recomendación clara para la próxima sesión, considerando RPE y molestias reportadas."
}
Español de México. Si hubo molestia o RPE >=9, prioriza recuperación antes que subir carga. No diagnósticas.`;

const PROGRESSION_ADJUST_PROMPT = `Eres un entrenador experto. Recibís los datos ORIGINALES y los EDITADOS de una sesión. Devuelves SOLO JSON válido con:
{
  "summary": "1-2 oraciones sobre qué cambió y cómo afecta la próxima sesión.",
  "delta_notes": ["cambio relevante 1", "cambio relevante 2"],
  "next_session": "Progresión ajustada para la próxima sesión.",
  "flags": ["señal a cuidar (si aplica)"]
}
Español de México. Si el cambio revela molestia o RPE alto, prioriza recuperación. No diagnósticas.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "IA no configurada" }, 500);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Sesión inválida" }, 401);

    const body = await req.json();
    const mode: string = body?.mode ?? "exercise";
    let systemPrompt = SYSTEM_PROMPT;
    let userPrompt = "";

    if (mode === "progression_adjust") {
      const { original, edited } = body ?? {};
      if (!original || !edited) return json({ error: "Faltan original/edited" }, 400);
      systemPrompt = PROGRESSION_ADJUST_PROMPT;
      userPrompt = `ORIGINAL:\n${JSON.stringify(original, null, 2)}\n\nEDITADO:\n${JSON.stringify(edited, null, 2)}\n\nDevuelve el JSON pedido.`;
    } else if (mode === "session_summary") {
      const { fecha, environment, duration_min, rpe, warmup_notes, discomforts, session_rest_sec, items } = body ?? {};
      if (!Array.isArray(items) || items.length === 0) return json({ error: "Faltan items" }, 400);
      systemPrompt = SESSION_SUMMARY_PROMPT;
      const itemsText = items.map((it: any) => {
        const setsTxt = (it.sets ?? []).map((s: any, i: number) =>
          `  #${i + 1} reps=${s.reps ?? "-"} kg=${s.weight_kg ?? "-"} dist_m=${s.distance_m ?? "-"} seg=${s.duration_sec ?? "-"}`
        ).join("\n");
        return `• ${it.exercise_name}${it.category ? ` (${it.category})` : ""}\n${setsTxt}`;
      }).join("\n");
      userPrompt = `Fecha: ${fecha ?? "n/a"} · Entorno: ${environment ?? "n/a"} · Duración: ${duration_min ?? "-"} min
RPE global: ${rpe ?? "-"} · Descanso prom.: ${session_rest_sec ?? "-"} seg
Calentamiento: ${warmup_notes || "(sin registrar)"}
Molestias: ${discomforts || "(sin registrar)"}

Ejercicios:
${itemsText}

Devuelve el JSON pedido.`;
    } else {
      const { exercise_name, category, recent_sets } = body ?? {};
      if (!exercise_name || !Array.isArray(recent_sets)) {
        return json({ error: "Faltan datos" }, 400);
      }
      userPrompt = `Ejercicio: ${exercise_name}
Categoría: ${category ?? "n/a"}
Últimos sets (más recientes al final):
${recent_sets
  .map((s: any, i: number) => `${i + 1}. reps=${s.reps ?? "-"} kg=${s.weight_kg ?? "-"} dist_m=${s.distance_m ?? "-"} seg=${s.duration_sec ?? "-"}${s.fecha ? ` (${s.fecha})` : ""}${s.rpe ? ` RPE=${s.rpe}` : ""}${s.discomforts ? ` MOLESTIA=${s.discomforts}` : ""}`)
  .join("\n")}

Devuelve el JSON pedido.`;
    }

    const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!gwRes.ok) {
      const t = await gwRes.text();
      console.error("gateway error", gwRes.status, t);
      if (gwRes.status === 429) return json({ error: "Demasiadas solicitudes, intenta en un momento." }, 429);
      if (gwRes.status === 402) return json({ error: "Créditos de IA agotados." }, 402);
      return json({ error: "Error del gateway de IA" }, 500);
    }

    const data = await gwRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { summary: content }; }

    if (mode === "progression_adjust") {
      return json({
        summary: parsed.summary ?? "",
        delta_notes: Array.isArray(parsed.delta_notes) ? parsed.delta_notes : [],
        next_session: parsed.next_session ?? "",
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      });
    }
    if (mode === "session_summary") {
      return json({
        summary: parsed.summary ?? "",
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        next_session: parsed.next_session ?? "",
      });
    }
    return json({
      summary: parsed.summary ?? "",
      progression: parsed.progression ?? "",
      next_target: parsed.next_target ?? "",
      cues: Array.isArray(parsed.cues) ? parsed.cues : [],
    });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message ?? "Error interno" }, 500);
  }
});

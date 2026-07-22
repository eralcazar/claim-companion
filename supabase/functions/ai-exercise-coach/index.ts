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
    const { exercise_name, category, recent_sets } = body ?? {};
    if (!exercise_name || !Array.isArray(recent_sets)) {
      return json({ error: "Faltan datos" }, 400);
    }

    const userPrompt = `Ejercicio: ${exercise_name}
Categoría: ${category ?? "n/a"}
Últimos sets (más recientes al final):
${recent_sets
  .map((s: any, i: number) => `${i + 1}. reps=${s.reps ?? "-"} kg=${s.weight_kg ?? "-"} dist_m=${s.distance_m ?? "-"} seg=${s.duration_sec ?? "-"}${s.fecha ? ` (${s.fecha})` : ""}`)
  .join("\n")}

Devuelve el JSON pedido.`;

    const gwRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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

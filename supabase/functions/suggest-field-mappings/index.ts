const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres un experto en mapeo de formularios médicos y de seguros en español. Recibirás:
- Una lista de "campos" del formulario (clave, etiqueta, tipo).
- Cuatro catálogos de "opciones" disponibles para mapear: perfil (datos del paciente), poliza (póliza de seguro), siniestro (datos del trámite/reclamación) y medico (datos del médico tratante).

Tu tarea: para cada campo, decide a qué OPCIÓN de catálogo corresponde mejor (o ninguna).
Reglas:
- Para cada campo devuelve { clave, tabla, columna_id, confianza }.
  * tabla ∈ "perfil" | "poliza" | "siniestro" | "medico" | "ninguno".
  * columna_id = el id exacto de una opción del catálogo elegido (o null si tabla="ninguno").
  * confianza = "alta" | "media" | "baja" según qué tan seguro estás.
- NO inventes ids: usa SOLO los ids que aparecen en las opciones recibidas.
- Si la etiqueta es genérica o ambigua, prefiere "ninguno".
- Considera sinónimos comunes (ej. "Nombre del asegurado" → perfil.first_name + apellidos; "No. póliza" → poliza.policy_number; "Diagnóstico" → siniestro.diagnosis; "Cédula profesional" → medico.cedula_general).
- Devuelve UNA entrada por cada campo recibido (mismo orden no es obligatorio).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return new Response(JSON.stringify({ error: "Cuerpo vacío." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campos, opciones } = parsed ?? {};
    if (!Array.isArray(campos) || campos.length === 0) {
      return new Response(JSON.stringify({ error: "Se requiere 'campos' (array no vacío)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!opciones || typeof opciones !== "object") {
      return new Response(JSON.stringify({ error: "Se requiere 'opciones' con catálogos." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    // Compact catalog for the prompt: only id + display.
    const compactCatalog = (arr: any[] | undefined) =>
      Array.isArray(arr)
        ? arr.map((o) => ({ id: String(o.id), nombre: String(o.nombre_display ?? o.id) }))
        : [];
    const opcionesCompactas = {
      perfil: compactCatalog(opciones.perfil),
      poliza: compactCatalog(opciones.poliza),
      siniestro: compactCatalog(opciones.siniestro),
      medico: compactCatalog(opciones.medico),
    };

    const validIds = new Set<string>([
      ...opcionesCompactas.perfil.map((o) => o.id),
      ...opcionesCompactas.poliza.map((o) => o.id),
      ...opcionesCompactas.siniestro.map((o) => o.id),
      ...opcionesCompactas.medico.map((o) => o.id),
    ]);

    const userPrompt = `CAMPOS A MAPEAR (${campos.length}):
${JSON.stringify(campos.map((c: any) => ({ clave: c.clave, etiqueta: c.etiqueta, tipo: c.tipo })))}

CATÁLOGOS DISPONIBLES:
${JSON.stringify(opcionesCompactas)}

Devuelve la respuesta usando la herramienta sugerir_mapeos.`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "sugerir_mapeos",
            description: "Devuelve la sugerencia de mapeo para cada campo recibido.",
            parameters: {
              type: "object",
              properties: {
                sugerencias: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      clave: { type: "string" },
                      tabla: {
                        type: "string",
                        enum: ["perfil", "poliza", "siniestro", "medico", "ninguno"],
                      },
                      columna_id: {
                        type: ["string", "null"],
                        description: "Id exacto de la opción elegida, o null si tabla=ninguno",
                      },
                      confianza: {
                        type: "string",
                        enum: ["alta", "media", "baja"],
                      },
                    },
                    required: ["clave", "tabla", "columna_id", "confianza"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["sugerencias"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "sugerir_mapeos" } },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de uso alcanzado. Intenta de nuevo en un momento." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Sin créditos de IA disponibles." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "Error de IA: " + txt.slice(0, 200) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiResp.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    let sugerencias: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        sugerencias = Array.isArray(args.sugerencias) ? args.sugerencias : [];
      } catch (e) {
        console.error("Error parseando tool args", e);
      }
    }

    // Validate: drop suggestions whose columna_id is unknown.
    sugerencias = sugerencias
      .filter((s) => s && typeof s.clave === "string")
      .map((s) => {
        const tabla = ["perfil", "poliza", "siniestro", "medico"].includes(s.tabla)
          ? s.tabla
          : "ninguno";
        let columna_id: string | null =
          tabla === "ninguno" || !s.columna_id ? null : String(s.columna_id);
        if (columna_id && !validIds.has(columna_id)) {
          columna_id = null;
        }
        const finalTabla = columna_id ? tabla : "ninguno";
        const confianza = ["alta", "media", "baja"].includes(s.confianza) ? s.confianza : "baja";
        return {
          clave: s.clave,
          tabla: finalTabla,
          columna_id,
          confianza,
        };
      });

    return new Response(JSON.stringify({ sugerencias }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-field-mappings error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
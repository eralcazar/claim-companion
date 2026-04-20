import { corsHeaders } from "@supabase/supabase-js/cors";

const SYSTEM_PROMPT = `Eres un experto en análisis de formularios médicos y de seguros en español. Recibirás la imagen de UNA página de un PDF de formulario. Tu tarea: identificar TODOS los campos rellenables (líneas en blanco, casillas, recuadros para escribir) y devolver sus coordenadas como porcentaje del ancho/alto de la página (0–100).

Reglas:
- Devuelve solo los recuadros donde el usuario debe ESCRIBIR algo (no los textos impresos).
- Para cada campo, infiere una clave en MAYÚSCULAS_CON_GUION_BAJO basada en la etiqueta cercana (ej: NOMBRE_PACIENTE, FECHA_NACIMIENTO, CURP, RFC, FIRMA).
- Etiqueta = el texto humano legible que aparece cerca del campo.
- tipo = "texto" | "fecha" | "numero" | "checkbox" | "firma" | "email" | "telefono".
- Coordenadas: x = borde izquierdo, y = borde superior, w = ancho, h = alto. TODO en porcentaje (0–100).
- No inventes campos donde no hay espacio para escribir.
- Devuelve entre 1 y 80 campos por página.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { image_base64, page_number, formulario_nombre } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 es requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY no configurada");

    const dataUrl = image_base64.startsWith("data:")
      ? image_base64
      : `data:image/png;base64,${image_base64}`;

    const userPrompt = `Formulario: ${formulario_nombre ?? "sin nombre"} — Página ${page_number ?? 1}.
Identifica todos los campos rellenables visibles en la imagen y devuelve el resultado usando la herramienta proponer_campos.`;

    const body = {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "proponer_campos",
            description: "Devuelve la lista de campos rellenables detectados en la página.",
            parameters: {
              type: "object",
              properties: {
                propuestas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      clave: { type: "string", description: "MAYUSCULAS_CON_GUION_BAJO" },
                      etiqueta: { type: "string" },
                      tipo: {
                        type: "string",
                        enum: ["texto", "fecha", "numero", "checkbox", "firma", "email", "telefono"],
                      },
                      x: { type: "number", description: "0-100, % desde borde izq" },
                      y: { type: "number", description: "0-100, % desde borde sup" },
                      w: { type: "number", description: "0-100, % ancho" },
                      h: { type: "number", description: "0-100, % alto" },
                    },
                    required: ["clave", "etiqueta", "tipo", "x", "y", "w", "h"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["propuestas"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "proponer_campos" } },
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
          JSON.stringify({ error: "Sin créditos de IA disponibles. Agrega fondos en Settings → Workspace → Usage." }),
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
    let propuestas: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        propuestas = Array.isArray(args.propuestas) ? args.propuestas : [];
      } catch (e) {
        console.error("Error parseando tool args", e);
      }
    }

    // Validación: descartar coords inválidas
    propuestas = propuestas.filter(
      (p) =>
        typeof p.x === "number" &&
        typeof p.y === "number" &&
        typeof p.w === "number" &&
        typeof p.h === "number" &&
        p.x >= 0 && p.x <= 100 &&
        p.y >= 0 && p.y <= 100 &&
        p.w >= 0.5 && p.w <= 100 &&
        p.h >= 0.5 && p.h <= 100 &&
        p.x + p.w <= 101 &&
        p.y + p.h <= 101 &&
        typeof p.clave === "string" && p.clave.length > 0,
    );

    return new Response(JSON.stringify({ propuestas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-form-fields error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
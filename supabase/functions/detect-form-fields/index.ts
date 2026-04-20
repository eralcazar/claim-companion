const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres un experto en análisis de formularios médicos y de seguros en español. Recibirás la imagen de UNA página de un PDF de formulario. Tu tarea: identificar TODOS los campos rellenables y las secciones temáticas, devolviendo sus coordenadas como porcentaje del ancho/alto de la página (0–100).

Reglas:
- Devuelve los recuadros donde el usuario debe ESCRIBIR algo (líneas, casillas, espacios en blanco).
- Para cada campo entrega DOS rectángulos:
    * label = la etiqueta/pregunta impresa visible (texto que describe qué se pide).
    * campo = el espacio en blanco donde el usuario escribirá la respuesta.
- Si no se distingue una etiqueta cercana, usa los mismos valores en label y campo.
- Para cada campo infiere una clave en MAYÚSCULAS_CON_GUION_BAJO basada en la etiqueta (ej: NOMBRE_PACIENTE, FECHA_NACIMIENTO, CURP, RFC, FIRMA).
- etiqueta = el texto humano legible que aparece cerca del campo.
- tipo = "texto" | "fecha" | "numero" | "checkbox" | "firma" | "email" | "telefono".
- seccion_sugerida = nombre del bloque temático en el que se ubica el campo (ej: "Datos del paciente", "Diagnóstico", "Datos del médico"). Usa el título visible en el PDF si existe.
- Coordenadas (x,y,w,h): x = borde izquierdo, y = borde superior, w = ancho, h = alto. TODO en porcentaje (0–100).
- También devuelve un arreglo "secciones" con los bloques temáticos detectados en esta página (nombre + página + orden de arriba abajo).
- No inventes campos donde no hay espacio para escribir.
- Devuelve entre 1 y 80 campos por página.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return new Response(JSON.stringify({ error: "Cuerpo vacío. La imagen puede ser demasiado grande." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch (e) {
      console.error("JSON parse failed, body length:", rawBody.length);
      return new Response(JSON.stringify({ error: "JSON inválido. Imagen probablemente demasiado grande (>4MB). Reduce la escala." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { image_base64, page_number, formulario_nombre } = parsed;
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
            description: "Devuelve la lista de campos rellenables y las secciones detectadas en la página.",
            parameters: {
              type: "object",
              properties: {
                secciones: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nombre: { type: "string", description: "Título visible del bloque" },
                      pagina: { type: "number", description: "Número de página" },
                      orden: { type: "number", description: "Orden de aparición en la página (de arriba a abajo)" },
                    },
                    required: ["nombre", "pagina", "orden"],
                    additionalProperties: false,
                  },
                },
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
                      page: { type: "number", description: "Número de página (igual al de la imagen)" },
                      seccion_sugerida: { type: "string", description: "Nombre de la sección a la que pertenece" },
                      label: {
                        type: "object",
                        description: "Rect de la pregunta/etiqueta impresa",
                        properties: {
                          x: { type: "number" }, y: { type: "number" },
                          w: { type: "number" }, h: { type: "number" },
                        },
                        required: ["x", "y", "w", "h"],
                        additionalProperties: false,
                      },
                      campo: {
                        type: "object",
                        description: "Rect del espacio en blanco a llenar",
                        properties: {
                          x: { type: "number" }, y: { type: "number" },
                          w: { type: "number" }, h: { type: "number" },
                        },
                        required: ["x", "y", "w", "h"],
                        additionalProperties: false,
                      },
                    },
                    required: ["clave", "etiqueta", "tipo", "page", "label", "campo"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["propuestas", "secciones"],
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
    let secciones: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        propuestas = Array.isArray(args.propuestas) ? args.propuestas : [];
        secciones = Array.isArray(args.secciones) ? args.secciones : [];
      } catch (e) {
        console.error("Error parseando tool args", e);
      }
    }

    const validRect = (r: any) =>
      r &&
      typeof r.x === "number" && typeof r.y === "number" &&
      typeof r.w === "number" && typeof r.h === "number" &&
      r.x >= 0 && r.x <= 100 && r.y >= 0 && r.y <= 100 &&
      r.w >= 0.1 && r.w <= 100 && r.h >= 0.1 && r.h <= 100;

    // Clamp rect to page bounds [0..100] instead of rejecting near-edge fields.
    const clampRect = (r: any) => {
      if (!validRect(r)) return null;
      const x = Math.max(0, Math.min(100, r.x));
      const y = Math.max(0, Math.min(100, r.y));
      const w = Math.max(0.1, Math.min(100 - x, r.w));
      const h = Math.max(0.1, Math.min(100 - y, r.h));
      return { x, y, w, h };
    };

    const totalRecibidas = propuestas.length;
    let descartadasSinClave = 0;
    let descartadasSinCampo = 0;

    propuestas = propuestas
      .filter((p) => {
        const ok = typeof p.clave === "string" && p.clave.length > 0;
        if (!ok) descartadasSinClave++;
        return ok;
      })
      .map((p) => {
        const campoRect = clampRect(p.campo) ?? clampRect({ x: p.x, y: p.y, w: p.w, h: p.h });
        return {
          ...p,
          page: typeof p.page === "number" ? p.page : (page_number ?? 1),
          campo: campoRect,
          label: clampRect(p.label),
        };
      })
      .filter((p) => {
        if (!p.campo) {
          descartadasSinCampo++;
          console.warn("[detect-form-fields] descartado sin coords válidas:", p.clave);
          return false;
        }
        return true;
      });

    const descartadas = descartadasSinClave + descartadasSinCampo;
    console.log(
      `[detect-form-fields] page=${page_number} recibidas=${totalRecibidas} aceptadas=${propuestas.length} descartadas=${descartadas} (sin_clave=${descartadasSinClave}, sin_campo=${descartadasSinCampo})`,
    );

    secciones = secciones
      .filter((s) => s && typeof s.nombre === "string" && s.nombre.trim().length > 0)
      .map((s, i) => ({
        nombre: s.nombre.trim(),
        pagina: typeof s.pagina === "number" ? s.pagina : (page_number ?? 1),
        orden: typeof s.orden === "number" ? s.orden : i,
      }));

    return new Response(JSON.stringify({ propuestas, secciones, descartadas }), {
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
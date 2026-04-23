// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Eres un analista experto en resultados clínicos de laboratorio e imagenología en español.
Tu tarea: extraer TODOS los indicadores medidos del documento (PDF o imagen) y devolverlos como JSON estructurado mediante la herramienta proporcionada.

Reglas estrictas:
- Extrae cada indicador con: nombre_indicador (ej: "Glucosa", "Hemoglobina"), codigo_indicador opcional (ej: "GLU"), valor numérico, unidad (ej: "mg/dL"), valor_referencia_min y valor_referencia_max si el rango aparece (ej: "70-110" → min=70, max=110; "<200" → max=200; ">40" → min=40).
- Si el resultado es cualitativo (Negativo/Positivo/Reactivo/Normal/Ausente), pon valor=null y registra el resultado textual en "observacion".
- Ignora encabezados, datos del paciente, firmas, comentarios médicos largos y cualquier texto no relacionado con valores medidos.
- NUNCA inventes valores. Si un campo no aparece claramente, omítelo (no lo pongas como 0).
- Si encuentras la fecha del resultado o el nombre del laboratorio en el documento, inclúyelos en los campos opcionales fecha_resultado (formato YYYY-MM-DD) y laboratorio_nombre.
- Limita a un máximo de 80 indicadores. Si hay más, prioriza los con valor numérico.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "No autorizado" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY no configurada" }, 500);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return jsonResponse({ error: "Sesión inválida" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => null);
    const resultadoId = body?.resultado_id;
    if (!resultadoId || typeof resultadoId !== "string") {
      return jsonResponse({ error: "resultado_id requerido" }, 400);
    }

    // Cargar resultado + estudio
    const { data: resultado, error: rErr } = await admin
      .from("resultados_estudios")
      .select("id, estudio_id, patient_id, pdf_path, pdf_name, fecha_resultado, laboratorio_nombre")
      .eq("id", resultadoId)
      .maybeSingle();
    if (rErr || !resultado) return jsonResponse({ error: "Resultado no encontrado" }, 404);

    const { data: estudio } = await admin
      .from("estudios_solicitados")
      .select("id, doctor_id, patient_id")
      .eq("id", resultado.estudio_id)
      .maybeSingle();

    // Autorización: admin, médico del estudio, o broker asignado al paciente
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    const isDoctor = estudio?.doctor_id === callerId;
    let isBroker = false;
    if (!isAdmin && !isDoctor) {
      const { data: bp } = await admin
        .from("broker_patients")
        .select("id")
        .eq("broker_id", callerId)
        .eq("patient_id", resultado.patient_id)
        .maybeSingle();
      isBroker = !!bp;
    }
    if (!isAdmin && !isDoctor && !isBroker) {
      return jsonResponse({ error: "Sin permisos para extraer indicadores" }, 403);
    }

    // Consume OCR quota (1 page) before doing the expensive AI call.
    // Charge it to the caller so each professional has its own balance.
    const { data: quotaResult, error: quotaErr } = await admin.rpc("consume_ocr_quota", {
      _user_id: callerId,
      _pages: 1,
      _resource_id: resultadoId,
    });
    if (quotaErr) {
      console.error("consume_ocr_quota error", quotaErr);
      return jsonResponse({ error: "No se pudo verificar la cuota OCR" }, 500);
    }
    if (!quotaResult?.ok) {
      return jsonResponse(
        {
          error: "Has llegado a tu límite de escaneos OCR. Comprá un paquete adicional para continuar.",
          code: "quota_exceeded",
          subscription_balance: quotaResult?.subscription_balance ?? 0,
          addon_balance: quotaResult?.addon_balance ?? 0,
        },
        402,
      );
    }

    // Descargar archivo del bucket privado
    const { data: file, error: dlErr } = await admin.storage
      .from("estudios-resultados")
      .download(resultado.pdf_path);
    if (dlErr || !file) return jsonResponse({ error: "No se pudo leer el archivo" }, 500);

    const arrayBuf = await file.arrayBuffer();
    if (arrayBuf.byteLength > 6 * 1024 * 1024) {
      return jsonResponse({ error: "Archivo demasiado grande (máx 6 MB). Reduce o convierte a imagen." }, 413);
    }

    // Determinar mime
    const lower = (resultado.pdf_name || resultado.pdf_path).toLowerCase();
    let mime = file.type || "application/octet-stream";
    if (mime === "application/octet-stream") {
      if (lower.endsWith(".pdf")) mime = "application/pdf";
      else if (lower.endsWith(".png")) mime = "image/png";
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) mime = "image/jpeg";
      else if (lower.endsWith(".webp")) mime = "image/webp";
    }

    // base64
    const bytes = new Uint8Array(arrayBuf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:${mime};base64,${base64}`;

    // Tool schema
    const tools = [
      {
        type: "function",
        function: {
          name: "extraer_indicadores",
          description: "Devuelve la lista de indicadores médicos extraídos del documento.",
          parameters: {
            type: "object",
            properties: {
              fecha_resultado: { type: "string", description: "YYYY-MM-DD si aparece" },
              laboratorio_nombre: { type: "string" },
              indicadores: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nombre_indicador: { type: "string" },
                    codigo_indicador: { type: "string" },
                    valor: { type: ["number", "null"] },
                    unidad: { type: "string" },
                    valor_referencia_min: { type: "number" },
                    valor_referencia_max: { type: "number" },
                    observacion: { type: "string" },
                  },
                  required: ["nombre_indicador"],
                },
              },
            },
            required: ["indicadores"],
          },
        },
      },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae todos los indicadores de este documento clínico." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extraer_indicadores" } },
      }),
    });

    if (aiResp.status === 429) return jsonResponse({ error: "Demasiadas solicitudes. Intenta en unos segundos." }, 429);
    if (aiResp.status === 402) return jsonResponse({ error: "Sin créditos de IA. Agrega fondos en Settings → Workspace → Usage." }, 402);
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      return jsonResponse({ error: "Error del servicio de IA" }, 502);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return jsonResponse({ error: "La IA no devolvió indicadores" }, 502);

    let parsed: any;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return jsonResponse({ error: "Respuesta de IA inválida" }, 502);
    }

    const rawIndicadores = Array.isArray(parsed.indicadores) ? parsed.indicadores : [];
    const fechaResultado: string | null = parsed.fecha_resultado || null;
    const laboratorioNombre: string | null = parsed.laboratorio_nombre || null;

    // Construir filas
    const rows = rawIndicadores
      .filter((i: any) => i && typeof i.nombre_indicador === "string" && i.nombre_indicador.trim().length > 0)
      .slice(0, 80)
      .map((i: any) => {
        const valor = typeof i.valor === "number" && Number.isFinite(i.valor) ? i.valor : null;
        const min = typeof i.valor_referencia_min === "number" && Number.isFinite(i.valor_referencia_min) ? i.valor_referencia_min : null;
        const max = typeof i.valor_referencia_max === "number" && Number.isFinite(i.valor_referencia_max) ? i.valor_referencia_max : null;
        const es_normal = valor != null && min != null && max != null ? valor >= min && valor <= max : null;
        return {
          resultado_id: resultado.id,
          patient_id: resultado.patient_id,
          nombre_indicador: i.nombre_indicador.trim().slice(0, 200),
          codigo_indicador: i.codigo_indicador ? String(i.codigo_indicador).slice(0, 50) : null,
          valor,
          unidad: i.unidad ? String(i.unidad).slice(0, 30) : (i.observacion ? String(i.observacion).slice(0, 30) : null),
          valor_referencia_min: min,
          valor_referencia_max: max,
          es_normal,
          flagged: es_normal === false,
        };
      });

    let inserted = 0;
    if (rows.length > 0) {
      const { error: insErr, count } = await admin
        .from("indicadores_estudio")
        .insert(rows, { count: "exact" });
      if (insErr) {
        console.error("Insert error", insErr);
        return jsonResponse({ error: "Error al guardar indicadores" }, 500);
      }
      inserted = count ?? rows.length;
    }

    // Actualizar metadata del resultado si vino info nueva
    const patch: any = {};
    if (fechaResultado && !resultado.fecha_resultado) patch.fecha_resultado = fechaResultado;
    if (laboratorioNombre && !resultado.laboratorio_nombre) patch.laboratorio_nombre = laboratorioNombre;
    if (Object.keys(patch).length > 0) {
      await admin.from("resultados_estudios").update(patch).eq("id", resultado.id);
    }

    return jsonResponse({
      inserted,
      meta: { fecha_resultado: fechaResultado, laboratorio_nombre: laboratorioNombre },
    });
  } catch (e) {
    console.error("extract-study-indicators error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
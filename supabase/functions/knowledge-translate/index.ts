// Traduce un documento al español clínico neutro y guarda el resultado.
import { createClient } from "npm:@supabase/supabase-js@2";
import { callGateway } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "IA no configurada" }), { status: 500, headers: corsHeaders });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const documentId: string | undefined = body?.document_id;
    let queueRowId: string | undefined = body?.queue_id;

    // Modo cron: si no viene document_id, procesa la siguiente pendiente
    if (!documentId) {
      const { data: next } = await admin.from("knowledge_translations_queue")
        .select("id, document_id").eq("status", "pending").order("created_at").limit(1).maybeSingle();
      if (!next) return new Response(JSON.stringify({ ok: true, drained: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      queueRowId = next.id;
      body.document_id = next.document_id;
    }
    const docId = body?.document_id;
    if (!docId) return new Response(JSON.stringify({ error: "document_id requerido" }), { status: 400, headers: corsHeaders });

    await admin.from("knowledge_translations_queue").update({ status: "processing" }).eq("document_id", docId);

    const { data: doc } = await admin.from("knowledge_documents")
      .select("id, title, summary, body_md, body_md_original, source_language").eq("id", docId).maybeSingle();
    if (!doc) return new Response(JSON.stringify({ error: "no encontrado" }), { status: 404, headers: corsHeaders });

    const src = doc.body_md_original || doc.body_md || "";
    const srcLang = doc.source_language || "en";

    const r = await callGateway(LOVABLE_API_KEY, "google/gemini-3-flash-preview", [
      { role: "system", content: "Eres un traductor médico. Traduce a español clínico neutro (México), preserva términos técnicos, unidades, dosis, hipervínculos y estructura markdown. Devuelve SOLO JSON válido: {\"title\":\"...\",\"summary\":\"...\",\"body_md\":\"...\"}" },
      { role: "user", content: `Idioma origen: ${srcLang}\nTítulo: ${doc.title}\nResumen: ${doc.summary ?? ""}\n\nCuerpo:\n${src.slice(0, 12000)}` },
    ], { maxOutputTokens: 3000, responseFormat: "json_object" });

    if (!r.ok || !r.content) {
      await admin.from("knowledge_translations_queue").update({
        status: "failed", attempts: 1, last_error: `gateway_${r.status}`,
      }).eq("document_id", docId);
      return new Response(JSON.stringify({ error: "traducción falló", detail: r.rawText }), { status: 502, headers: corsHeaders });
    }
    let parsed: any;
    try { parsed = JSON.parse(r.content); } catch { parsed = null; }
    if (!parsed?.body_md) {
      await admin.from("knowledge_translations_queue").update({ status: "failed", last_error: "parse_error" }).eq("document_id", docId);
      return new Response(JSON.stringify({ error: "parse fallido" }), { status: 502, headers: corsHeaders });
    }

    await admin.from("knowledge_documents").update({
      title: parsed.title || doc.title,
      summary: parsed.summary || doc.summary,
      body_md: parsed.body_md,
      body_md_original: doc.body_md_original || src,
      language: "es",
      translated_by_ai: true,
      translated_at: new Date().toISOString(),
    }).eq("id", docId);

    await admin.from("knowledge_translations_queue").update({ status: "done" }).eq("document_id", docId);

    return new Response(JSON.stringify({ ok: true, document_id: docId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: corsHeaders });
  }
});
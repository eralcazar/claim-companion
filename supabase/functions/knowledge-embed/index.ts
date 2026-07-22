// Chunkea el body_md de un documento y regenera embeddings 1536-dim.
import { createClient } from "npm:@supabase/supabase-js@2";
import { embedText } from "../_shared/ai-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function chunk(text: string, size = 3200, overlap = 400): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    out.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "IA no configurada" }), { status: 500, headers: corsHeaders });
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Sesión inválida" }), { status: 401, headers: corsHeaders });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Solo admin" }), { status: 403, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const documentId: string | undefined = body?.document_id;
    if (!documentId) return new Response(JSON.stringify({ error: "document_id requerido" }), { status: 400, headers: corsHeaders });

    const { data: doc, error } = await admin.from("knowledge_documents")
      .select("id, title, summary, body_md").eq("id", documentId).maybeSingle();
    if (error || !doc) return new Response(JSON.stringify({ error: "Documento no encontrado" }), { status: 404, headers: corsHeaders });

    const fullText = [doc.title, doc.summary, doc.body_md].filter(Boolean).join("\n\n");
    const parts = chunk(fullText);
    await admin.from("knowledge_chunks").delete().eq("document_id", documentId);

    let inserted = 0;
    for (let i = 0; i < parts.length; i++) {
      const vec = await embedText(LOVABLE_API_KEY, parts[i]);
      if (!vec) continue;
      const { error: insErr } = await admin.from("knowledge_chunks").insert({
        document_id: documentId,
        chunk_index: i,
        content: parts[i],
        token_count: Math.ceil(parts[i].length / 4),
        embedding: vec as any,
      });
      if (!insErr) inserted++;
    }
    return new Response(JSON.stringify({ ok: true, chunks: inserted, total: parts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("knowledge-embed error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: corsHeaders });
  }
});
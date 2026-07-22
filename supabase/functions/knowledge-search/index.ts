// Búsqueda semántica pública sobre la base de conocimiento con rerank opcional.
import { createClient } from "npm:@supabase/supabase-js@2";
import { embedText, rerankKnowledge, type KnowledgeMatch } from "../_shared/ai-router.ts";

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
    const query = (body?.query ?? "").toString().trim();
    if (!query || query.length < 2) return new Response(JSON.stringify({ error: "query requerida" }), { status: 400, headers: corsHeaders });
    const categories: string[] | null = Array.isArray(body?.categories) && body.categories.length ? body.categories : null;
    const rerank: boolean = body?.rerank !== false;
    const keep: number = Math.min(20, Math.max(1, Number(body?.limit) || 6));

    const vec = await embedText(LOVABLE_API_KEY, query);
    if (!vec) return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data, error } = await admin.rpc("match_knowledge", {
      query_embedding: vec as any,
      match_count: rerank ? 30 : keep,
      min_similarity: 0.5,
      categories,
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    let matches = (data ?? []) as KnowledgeMatch[];
    if (rerank && matches.length > keep) {
      matches = await rerankKnowledge(LOVABLE_API_KEY, query, matches, keep);
    } else {
      matches = matches.slice(0, keep);
    }
    return new Response(JSON.stringify({ results: matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), { status: 500, headers: corsHeaders });
  }
});
// Descarga una receta de MedlinePlus (dominio público, NIH) y devuelve un draft
// estructurado para que el usuario confirme en el editor de recetas.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}

function extractSection(html: string, headingRegex: RegExp, endHeadingRegex: RegExp): string | null {
  const m = html.match(headingRegex);
  if (!m || m.index == null) return null;
  const rest = html.slice(m.index + m[0].length);
  const endMatch = rest.match(endHeadingRegex);
  const section = endMatch && endMatch.index != null ? rest.slice(0, endMatch.index) : rest;
  return section;
}

function extractListItems(sectionHtml: string): string[] {
  const items: string[] = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sectionHtml)) !== null) {
    const t = stripTags(m[1]);
    if (t) items.push(t);
    if (items.length > 60) break;
  }
  return items;
}

function parseIngredientLine(line: string): { name: string; grams: number } {
  // Muy conservador: intenta extraer gramos si aparecen. Si no, deja 0 (el usuario ajusta).
  const m = line.match(/(\d+(?:[.,]\d+)?)\s*(g|gramos|gr)\b/i);
  let grams = 0;
  if (m) grams = Number(m[1].replace(",", "."));
  return { name: line.slice(0, 140), grams };
}

// Rate limit muy simple en memoria: 1 req cada 3s por usuario.
const lastCallByUser = new Map<string, number>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "Method not allowed" }, 405);
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "No autorizado" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return j({ error: "Sesión inválida" }, 401);

    const now = Date.now();
    const last = lastCallByUser.get(userData.user.id) ?? 0;
    if (now - last < 3000) return j({ error: "Muchas solicitudes seguidas, esperá 3 segundos" }, 429);
    lastCallByUser.set(userData.user.id, now);

    const { url } = await req.json();
    if (!url || typeof url !== "string") return j({ error: "url requerida" }, 400);
    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch { return j({ error: "URL inválida" }, 400); }
    if (parsedUrl.hostname !== "medlineplus.gov") return j({ error: "Solo se aceptan URLs de medlineplus.gov" }, 400);
    if (!parsedUrl.pathname.startsWith("/spanish/recetas/")) return j({ error: "Solo recetas en español de MedlinePlus" }, 400);

    const res = await fetch(parsedUrl.toString(), {
      headers: { "User-Agent": "CareCentral/1.0 (recipe-importer; contacto: soporte@carecentral.live)" },
    });
    if (!res.ok) return j({ error: `MedlinePlus respondió ${res.status}` }, 502);
    const html = await res.text();

    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? stripTags(titleMatch[1]).replace(/\s*-\s*MedlinePlus.*$/i, "").trim() : "Receta MedlinePlus";

    const boundary = /<h[1-4][^>]*>/i;
    const ingSection = extractSection(html, /<h[1-4][^>]*>\s*ingredientes[\s\S]*?<\/h[1-4]>/i, boundary);
    const stepsSection =
      extractSection(html, /<h[1-4][^>]*>\s*(preparaci[oó]n|instrucciones|procedimiento)[\s\S]*?<\/h[1-4]>/i, boundary) || "";
    const aboutSection =
      extractSection(html, /<h[1-4][^>]*>\s*(acerca de|fuente|origen)[\s\S]*?<\/h[1-4]>/i, boundary) || "";

    const ingredients = ingSection ? extractListItems(ingSection).map(parseIngredientLine) : [];
    const stepsText = stepsSection ? stripTags(stepsSection) : "";
    const aboutText = aboutSection ? stripTags(aboutSection).slice(0, 400) : "";

    return j({
      title,
      ingredients,
      steps: stepsText,
      source_type: "medlineplus",
      source_url: parsedUrl.toString(),
      source_author: "MedlinePlus (NIH)",
      attribution: `Contenido de MedlinePlus (Biblioteca Nacional de Medicina de EE. UU.), dominio público. Uso conforme a https://medlineplus.gov/spanish/acercade/usodecontenido/ . ${aboutText}`.trim(),
      notes: null,
    });
  } catch (e) {
    console.error("medlineplus-recipe-import error", e);
    return j({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
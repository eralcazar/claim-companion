// Sincronización automática/manual de recetas MedlinePlus (dominio público, NIH).
// - Recorre una lista de URLs (seed + estado persistido) y detecta cambios via hash.
// - Registra cada corrida en public.recipe_import_runs con los cambios detectados.
// - Solo requiere x-cron-secret cuando se invoca desde pg_cron; también puede
//   llamarse desde el navegador por un admin autenticado.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Lista curada inicial (ampliable desde la tabla medlineplus_url_state).
const SEED_URLS: string[] = [
  "https://medlineplus.gov/spanish/recetas/pollo-al-horno-con-hierbas/",
  "https://medlineplus.gov/spanish/recetas/salteado-de-pescado-con-verduras/",
  "https://medlineplus.gov/spanish/recetas/sopa-de-lentejas-con-verduras/",
  "https://medlineplus.gov/spanish/recetas/ensalada-de-quinua-con-frijol-negro/",
  "https://medlineplus.gov/spanish/recetas/pasta-integral-con-brocoli/",
  "https://medlineplus.gov/spanish/recetas/avena-con-frutas-y-nueces/",
];

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}

async function sha256(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchAndHash(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": "CareCentral/1.0 (recipe-sync)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).replace(/\s*-\s*MedlinePlus.*$/i, "").trim() : url;
  // Hash de contenido "cocinado" (sin scripts/estilos/espacios variables)
  const cooked = stripTags(html).slice(0, 60000);
  const hash = await sha256(cooked);
  return { title, hash };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CRON_SECRET = Deno.env.get("RECIPE_SYNC_CRON_SECRET") ?? "";
  const admin = createClient(SUPABASE_URL, SERVICE);

  // Autorización: admin autenticado OR cron con secreto compartido
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const authHeader = req.headers.get("Authorization");
  let isAuthorized = false;
  if (CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) {
    isAuthorized = true;
  } else if (authHeader) {
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const uc = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await uc.auth.getUser();
    if (u?.user) {
      const { data: role } = await uc.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (role) isAuthorized = true;
    }
  }
  if (!isAuthorized) return j({ error: "No autorizado" }, 401);

  // Crear run
  const { data: runRow, error: runErr } = await admin
    .from("recipe_import_runs")
    .insert({ source: "medlineplus", status: "running" })
    .select("id").single();
  if (runErr) return j({ error: runErr.message }, 500);
  const runId = runRow.id as string;

  const changes: Array<{ url: string; action: "new" | "updated" | "unchanged" | "error"; title?: string; prev_hash?: string; new_hash?: string; error?: string }> = [];
  let added = 0, updated = 0, skipped = 0;

  // Combinar seed + estado persistido
  const { data: state } = await admin.from("medlineplus_url_state").select("url,last_hash,active");
  const urls = new Set<string>([...SEED_URLS, ...(state ?? []).filter((s: any) => s.active !== false).map((s: any) => s.url)]);
  const prevByUrl = new Map<string, string>((state ?? []).map((s: any) => [s.url, s.last_hash ?? ""]));

  for (const url of urls) {
    try {
      const { title, hash } = await fetchAndHash(url);
      const prev = prevByUrl.get(url);
      if (!prev) {
        added++;
        changes.push({ url, action: "new", title, new_hash: hash });
      } else if (prev !== hash) {
        updated++;
        changes.push({ url, action: "updated", title, prev_hash: prev, new_hash: hash });
      } else {
        skipped++;
        changes.push({ url, action: "unchanged", title });
      }
      await admin.from("medlineplus_url_state").upsert({
        url, last_hash: hash, last_title: title, last_seen_at: new Date().toISOString(), active: true,
      });
    } catch (e) {
      skipped++;
      changes.push({ url, action: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  await admin.from("recipe_import_runs").update({
    status: "ok",
    ended_at: new Date().toISOString(),
    added_count: added, updated_count: updated, skipped_count: skipped,
    changes,
  }).eq("id", runId);

  return j({ ok: true, run_id: runId, added, updated, skipped, changes });
});
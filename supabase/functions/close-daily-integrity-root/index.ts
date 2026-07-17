import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(msg: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const url = new URL(req.url);
  const day = url.searchParams.get("day") ?? new Date().toISOString().slice(0, 10);

  const tips: Record<string, string> = {};
  for (const t of ["medical_records", "recetas", "estudios_solicitados"] as const) {
    const { data } = await supabase
      .from(t)
      .select("record_hash")
      .not("record_hash", "is", null)
      .lte("created_at", `${day}T23:59:59.999Z`)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    tips[t] = data?.record_hash ?? "EMPTY";
  }

  const { data: prev } = await supabase
    .from("integrity_daily_roots")
    .select("daily_root")
    .lt("day", day)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevRoot = prev?.daily_root ?? "GENESIS";

  const dailyRoot = await sha256Hex(
    `${day}|${tips.medical_records}|${tips.recetas}|${tips.estudios_solicitados}|${prevRoot}`
  );

  const { error } = await supabase.from("integrity_daily_roots").upsert({
    day,
    medical_records_tip: tips.medical_records,
    recetas_tip: tips.recetas,
    estudios_tip: tips.estudios_solicitados,
    prev_daily_root: prevRoot,
    daily_root: dailyRoot,
    published_at: new Date().toISOString(),
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true, day, daily_root: dailyRoot, tips, prev_root: prevRoot }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
// Genera sesiones programadas a partir de un plan y sus recordatorios.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No autorizado" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await client.auth.getUser();
    if (!u?.user) return json({ error: "Sesión inválida" }, 401);

    const { plan_id, weeks = 4 } = await req.json();
    if (!plan_id) return json({ error: "plan_id requerido" }, 400);

    const { data: reminders, error: rerr } = await client
      .from("workout_plan_reminders")
      .select("*")
      .eq("plan_id", plan_id)
      .eq("patient_id", u.user.id)
      .eq("active", true);
    if (rerr) throw rerr;
    if (!reminders?.length) return json({ created: 0, message: "No hay recordatorios activos" });

    const rows: any[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let w = 0; w < weeks; w++) {
      for (const r of reminders) {
        const target = new Date(today);
        const diff = (r.weekday - today.getDay() + 7) % 7;
        target.setDate(today.getDate() + diff + w * 7);
        target.setHours(r.hour, r.minute, 0, 0);
        if (target < new Date()) continue;
        rows.push({
          plan_id,
          patient_id: u.user.id,
          scheduled_at: target.toISOString(),
          target_type: "plan_day",
          target_reference: { weekday: r.weekday },
          status: "pending",
        });
      }
    }

    if (rows.length === 0) return json({ created: 0 });
    const { data: existing } = await client
      .from("workout_sessions_scheduled")
      .select("scheduled_at")
      .eq("plan_id", plan_id)
      .eq("patient_id", u.user.id)
      .gte("scheduled_at", rows[0].scheduled_at);
    const existingSet = new Set((existing ?? []).map((e: any) => new Date(e.scheduled_at).toISOString()));
    const fresh = rows.filter((r) => !existingSet.has(new Date(r.scheduled_at).toISOString()));
    if (fresh.length === 0) return json({ created: 0 });
    const { error: iErr } = await client.from("workout_sessions_scheduled").insert(fresh);
    if (iErr) throw iErr;
    return json({ created: fresh.length });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message ?? "Error interno" }, 500);
  }
});
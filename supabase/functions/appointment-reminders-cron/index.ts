import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = Date.now();
  const in24hStart = new Date(now + 23.75 * 3600 * 1000).toISOString();
  const in24hEnd = new Date(now + 24.25 * 3600 * 1000).toISOString();
  const in1hStart = new Date(now + 45 * 60 * 1000).toISOString();
  const in1hEnd = new Date(now + 75 * 60 * 1000).toISOString();

  const results = { r24: 0, r1: 0, errors: [] as string[] };

  async function processWindow(startIso: string, endIso: string, kind: "24h" | "1h") {
    const col = kind === "24h" ? "reminder_24h_sent_at" : "reminder_1h_sent_at";
    const prefCol = kind === "24h" ? "remind_appointment_24h" : "remind_appointment_1h";

    const { data: appts, error } = await admin
      .from("appointments")
      .select("id, user_id, appointment_date, appointment_type, doctor_name_manual, address, is_telemedicine, reminder_enabled")
      .gte("appointment_date", startIso)
      .lte("appointment_date", endIso)
      .is(col, null);
    if (error) { results.errors.push(`${kind}: ${error.message}`); return; }

    for (const a of appts ?? []) {
      if (a.reminder_enabled === false) continue;
      const { data: pref } = await admin
        .from("notification_preferences")
        .select(prefCol)
        .eq("user_id", a.user_id)
        .maybeSingle();
      if (pref && (pref as any)[prefCol] === false) continue;

      const when = new Date(a.appointment_date).toLocaleString("es-MX", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      });
      const title = kind === "24h" ? "Cita mañana" : "Tu cita es en 1 hora";
      const body = `${a.appointment_type ?? "Consulta"}${a.doctor_name_manual ? " con " + a.doctor_name_manual : ""} · ${when}`;

      const { error: nErr } = await admin.from("notifications").insert({
        user_id: a.user_id,
        title,
        body,
        type: "appointment_reminder",
        data: { appointment_id: a.id, when: a.appointment_date, kind },
      });
      if (nErr) { results.errors.push(`notif ${a.id}: ${nErr.message}`); continue; }

      await admin.from("appointments").update({ [col]: new Date().toISOString() }).eq("id", a.id);
      if (kind === "24h") results.r24++; else results.r1++;
    }
  }

  await processWindow(in24hStart, in24hEnd, "24h");
  await processWindow(in1hStart, in1hEnd, "1h");

  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
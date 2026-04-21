import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const reminderLabel = (m: number) => {
  if (m < 60) return `${m} minutos`;
  if (m < 1440) return `${Math.round(m / 60)} hora${m / 60 > 1 ? "s" : ""}`;
  return `${Math.round(m / 1440)} día${m / 1440 > 1 ? "s" : ""}`;
};

const typeLabel: Record<string, string> = {
  consulta: "Consulta",
  estudio: "Estudio",
  procedimiento: "Procedimiento",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find appts where reminder due
  const { data: appts, error } = await supabase
    .from("appointments")
    .select("id, user_id, appointment_date, appointment_type, reminder_minutes_before, address")
    .eq("reminder_enabled", true)
    .is("reminder_sent_at", null)
    .not("reminder_minutes_before", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  const due = (appts ?? []).filter((a: any) => {
    const apptTs = new Date(a.appointment_date).getTime();
    const triggerAt = apptTs - (a.reminder_minutes_before ?? 0) * 60_000;
    return now >= triggerAt && now < apptTs;
  });

  let sent = 0;
  for (const a of due) {
    const label = typeLabel[a.appointment_type] ?? a.appointment_type;
    const when = new Date(a.appointment_date).toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
    });
    const { error: nErr } = await supabase.from("notifications").insert({
      user_id: a.user_id,
      title: `Recordatorio: ${label}`,
      body: `Tu cita es en ${reminderLabel(a.reminder_minutes_before)} (${when})${a.address ? ` — ${a.address}` : ""}`,
      link: "/agenda",
    });
    if (nErr) continue;
    await supabase.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", a.id);
    sent++;
  }

  return new Response(JSON.stringify({ checked: appts?.length ?? 0, sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
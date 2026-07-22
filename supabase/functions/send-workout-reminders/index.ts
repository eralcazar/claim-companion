// Cron: envía notificaciones para sesiones programadas próximas.
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
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const now = new Date();
    const in12h = new Date(now.getTime() + 12 * 3600 * 1000);

    const { data: due, error } = await admin
      .from("workout_sessions_scheduled")
      .select("id, patient_id, scheduled_at, plan_id, target_reference")
      .eq("status", "pending")
      .is("reminder_sent_at", null)
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", in12h.toISOString())
      .limit(200);
    if (error) throw error;

    let sent = 0;
    for (const s of due ?? []) {
      const minsUntil = Math.round((new Date(s.scheduled_at).getTime() - now.getTime()) / 60000);
      const { data: rems } = await admin
        .from("workout_plan_reminders")
        .select("minutes_before")
        .eq("plan_id", s.plan_id)
        .eq("patient_id", s.patient_id)
        .eq("active", true)
        .limit(1);
      const mb = rems?.[0]?.minutes_before ?? 30;
      if (minsUntil > mb + 5) continue;

      await admin.from("notifications").insert({
        user_id: s.patient_id,
        type: "workout_reminder",
        title: "Entrenamiento programado",
        body: `Tenés sesión en ${minsUntil} min. Registrala al terminar para que el Coach IA ajuste tu progresión.`,
        data: { scheduled_id: s.id, plan_id: s.plan_id },
      });
      await admin.from("workout_sessions_scheduled").update({ reminder_sent_at: new Date().toISOString() }).eq("id", s.id);
      sent++;
    }
    return json({ checked: due?.length ?? 0, sent });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message ?? "Error interno" }, 500);
  }
});
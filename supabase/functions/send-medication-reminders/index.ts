import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const nowIso = new Date().toISOString();

  // 1. Programaciones expiradas → desactivar
  const { data: expired } = await supabase
    .from("medication_schedule")
    .select("id, medication_id")
    .eq("active", true)
    .not("ends_at", "is", null)
    .lte("ends_at", nowIso);

  let completed = 0;
  if (expired && expired.length) {
    const ids = expired.map((e) => e.id);
    await supabase.from("medication_schedule").update({ active: false }).in("id", ids);
    const medIds = expired.map((e) => e.medication_id);
    await supabase.from("medications").update({ active: false }).in("id", medIds);
    completed = expired.length;
  }

  // 2. Tomas vencidas → notificar
  const { data: due } = await supabase
    .from("medication_schedule")
    .select("id, user_id, medication_id, interval_hours, ends_at, next_dose_at")
    .eq("active", true)
    .lte("next_dose_at", nowIso);

  let sent = 0;
  if (due && due.length) {
    const medIds = [...new Set(due.map((d) => d.medication_id))];
    const { data: meds } = await supabase
      .from("medications")
      .select("id, name, dosage")
      .in("id", medIds);
    const medMap = new Map((meds ?? []).map((m) => [m.id, m]));

    for (const row of due) {
      const med = medMap.get(row.medication_id);
      if (!med) continue;

      await supabase.from("notifications").insert({
        user_id: row.user_id,
        title: `💊 Hora de tomar ${med.name}`,
        body: `Dosis: ${med.dosage}. Próxima toma en ${row.interval_hours}h`,
        link: "/medicamentos",
      });

      const nextDose = new Date(Date.now() + Number(row.interval_hours) * 3600000);
      const reachedEnd = row.ends_at && nextDose >= new Date(row.ends_at);

      if (reachedEnd) {
        await supabase.from("medication_schedule").update({
          active: false,
          last_dose_at: nowIso,
        }).eq("id", row.id);
        await supabase.from("medications").update({ active: false }).eq("id", row.medication_id);
        completed++;
      } else {
        await supabase.from("medication_schedule").update({
          last_dose_at: nowIso,
          next_dose_at: nextDose.toISOString(),
        }).eq("id", row.id);
      }

      sent++;
    }
  }

  return new Response(
    JSON.stringify({ checked: (due?.length ?? 0), sent, completed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
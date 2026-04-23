import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Schedule = {
  id: string;
  patient_id: string;
  created_by: string;
  mode: "interval" | "daily_times" | "weekly";
  interval_hours: number | null;
  daily_times: string[] | null;
  weekdays: number[] | null;
  timezone: string;
  label: string | null;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
  next_run_at: string;
  last_run_at: string | null;
};

/**
 * Devuelve {hour, minute, weekday(0=dom..6=sab), y/m/d} de un Date en una zona dada.
 */
function partsInTZ(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wkMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: wkMap[get("weekday")] ?? 0,
  };
}

/**
 * Convierte fecha local (en TZ) a UTC ISO. Aproximación: calcula offset usando comparativa.
 */
function localToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  // Fecha "naive" como si fuera UTC
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  // Ver qué hora marca esa fecha-UTC en la TZ destino
  const p = partsInTZ(guess, tz);
  // Diferencia entre lo deseado y lo que ve la TZ → ajuste
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  const seenAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const diff = desired - seenAsUtc;
  return new Date(guess.getTime() + diff);
}

/**
 * Calcula próxima ejecución estrictamente posterior a `from` para un schedule.
 */
function computeNextRun(s: Schedule, from: Date): Date {
  if (s.mode === "interval") {
    const ms = (s.interval_hours ?? 1) * 3600_000;
    const base = s.last_run_at ? new Date(s.last_run_at).getTime() : new Date(s.starts_at).getTime();
    let next = base + ms;
    if (next <= from.getTime()) {
      // saltar al siguiente intervalo posterior a "from"
      const elapsed = from.getTime() - base;
      const steps = Math.floor(elapsed / ms) + 1;
      next = base + steps * ms;
    }
    return new Date(next);
  }

  const times = (s.daily_times ?? []).map((t) => {
    const [h, m] = t.split(":").map(Number);
    return { h: h || 0, m: m || 0 };
  }).filter((t) => Number.isFinite(t.h) && Number.isFinite(t.m));

  if (times.length === 0) {
    // sin horarios: empuja 1 día para no bloquear cron
    return new Date(from.getTime() + 86400_000);
  }

  const weekdays =
    s.mode === "weekly" && s.weekdays && s.weekdays.length > 0
      ? new Set(s.weekdays.map((n) => Number(n)))
      : null;

  // Buscar en los próximos 14 días
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    // Tomamos "hoy en TZ" desde `from`
    const fromTz = partsInTZ(from, s.timezone);
    // Suma offset de días en UTC; recalcula partes
    const baseUtc = new Date(Date.UTC(fromTz.year, fromTz.month - 1, fromTz.day) + dayOffset * 86400_000);
    const dayParts = partsInTZ(baseUtc, s.timezone);

    if (weekdays && !weekdays.has(dayParts.weekday)) continue;

    for (const t of times.slice().sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m))) {
      const candidate = localToUtc(dayParts.year, dayParts.month, dayParts.day, t.h, t.m, s.timezone);
      if (candidate.getTime() > from.getTime()) {
        return candidate;
      }
    }
  }
  // fallback
  return new Date(from.getTime() + 86400_000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Schedules vencidos por ends_at → desactivar
  const { data: expired } = await supabase
    .from("bp_reminder_schedules")
    .select("id")
    .eq("active", true)
    .not("ends_at", "is", null)
    .lte("ends_at", nowIso);

  let deactivated = 0;
  if (expired && expired.length) {
    await supabase
      .from("bp_reminder_schedules")
      .update({ active: false })
      .in("id", expired.map((e) => e.id));
    deactivated = expired.length;
  }

  // 2. Schedules con next_run_at vencido → notificar
  const { data: due, error } = await supabase
    .from("bp_reminder_schedules")
    .select("*")
    .eq("active", true)
    .lte("next_run_at", nowIso)
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  for (const s of (due ?? []) as Schedule[]) {
    const label = s.label?.trim() ? s.label.trim() : "tu presión arterial";
    await supabase.from("notifications").insert({
      user_id: s.patient_id,
      title: `🩺 Hora de medir ${label}`,
      body: "Registra tu próxima toma de presión arterial.",
      link: `/presion?paciente=${s.patient_id}`,
    });

    const next = computeNextRun(s, now);
    const reachedEnd = s.ends_at && next >= new Date(s.ends_at);

    if (reachedEnd) {
      await supabase
        .from("bp_reminder_schedules")
        .update({ active: false, last_run_at: nowIso })
        .eq("id", s.id);
    } else {
      await supabase
        .from("bp_reminder_schedules")
        .update({ last_run_at: nowIso, next_run_at: next.toISOString() })
        .eq("id", s.id);
    }
    sent++;
  }

  return new Response(
    JSON.stringify({ checked: due?.length ?? 0, sent, deactivated }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
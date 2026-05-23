// Mini RRULE expander. Soporta FREQ=WEEKLY|DAILY, INTERVAL, BYDAY (MO..SU), UNTIL.
// No depende de librería externa.

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export interface ParsedRRule {
  freq: "DAILY" | "WEEKLY";
  interval: number;
  byday: number[]; // 0=Sun..6=Sat
  until?: Date;
  count?: number;
}

export function parseRRule(rrule: string): ParsedRRule {
  const out: ParsedRRule = { freq: "WEEKLY", interval: 1, byday: [] };
  rrule
    .replace(/^RRULE:/i, "")
    .split(";")
    .forEach((p) => {
      const [k, v] = p.split("=");
      if (!k || !v) return;
      const key = k.toUpperCase();
      if (key === "FREQ") out.freq = v.toUpperCase() as any;
      else if (key === "INTERVAL") out.interval = parseInt(v, 10) || 1;
      else if (key === "BYDAY") out.byday = v.split(",").map((d) => DAY_CODES.indexOf(d.toUpperCase())).filter((i) => i >= 0);
      else if (key === "UNTIL") out.until = parseUntil(v);
      else if (key === "COUNT") out.count = parseInt(v, 10);
    });
  return out;
}

function parseUntil(v: string): Date {
  // YYYYMMDD or YYYYMMDDTHHMMSSZ
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
  if (!m) return new Date(v);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
}

export function buildRRule(opts: { freq: "DAILY" | "WEEKLY"; interval?: number; byday?: number[]; until?: Date }): string {
  const parts = [`FREQ=${opts.freq}`];
  if (opts.interval && opts.interval > 1) parts.push(`INTERVAL=${opts.interval}`);
  if (opts.byday && opts.byday.length) parts.push(`BYDAY=${opts.byday.map((d) => DAY_CODES[d]).join(",")}`);
  if (opts.until) {
    const u = opts.until;
    const z = (n: number) => n.toString().padStart(2, "0");
    parts.push(`UNTIL=${u.getUTCFullYear()}${z(u.getUTCMonth() + 1)}${z(u.getUTCDate())}T235959Z`);
  }
  return parts.join(";");
}

/** Expande una recurrencia a fechas concretas entre [from, to]. */
export function expandRecurrence(
  rrule: string,
  startDate: Date,
  horaInicio: string, // "HH:MM" o "HH:MM:SS"
  from: Date,
  to: Date,
  endDate?: Date | null,
): Date[] {
  const rule = parseRRule(rrule);
  const [hh, mm] = horaInicio.split(":").map(Number);
  const upperBound = [to, rule.until, endDate].filter(Boolean).reduce((min: Date, d: any) => (d! < min ? d! : min), to);
  const results: Date[] = [];
  let count = 0;
  const maxIter = 500;

  let cursor = new Date(startDate);
  cursor.setHours(hh, mm, 0, 0);

  while (cursor <= upperBound && count < maxIter) {
    count++;
    if (cursor >= from) {
      if (rule.freq === "WEEKLY" && rule.byday.length) {
        // se procesa abajo
      } else {
        results.push(new Date(cursor));
      }
    }
    if (rule.freq === "DAILY") {
      cursor.setDate(cursor.getDate() + rule.interval);
    } else if (rule.freq === "WEEKLY") {
      if (rule.byday.length) {
        // expandir la semana actual
        const weekStart = new Date(cursor);
        weekStart.setDate(cursor.getDate() - cursor.getDay()); // domingo
        for (const d of rule.byday) {
          const occ = new Date(weekStart);
          occ.setDate(weekStart.getDate() + d);
          occ.setHours(hh, mm, 0, 0);
          if (occ >= from && occ <= upperBound && occ >= startDate) {
            results.push(new Date(occ));
          }
        }
        cursor.setDate(cursor.getDate() + 7 * rule.interval);
      } else {
        cursor.setDate(cursor.getDate() + 7 * rule.interval);
      }
    } else break;
    if (rule.count && results.length >= rule.count) break;
  }
  // dedupe + sort
  const seen = new Set<number>();
  return results
    .filter((d) => {
      const t = d.getTime();
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    })
    .sort((a, b) => a.getTime() - b.getTime());
}

export const WEEKDAYS_ES = [
  { idx: 1, short: "L", long: "Lunes" },
  { idx: 2, short: "M", long: "Martes" },
  { idx: 3, short: "X", long: "Miércoles" },
  { idx: 4, short: "J", long: "Jueves" },
  { idx: 5, short: "V", long: "Viernes" },
  { idx: 6, short: "S", long: "Sábado" },
  { idx: 0, short: "D", long: "Domingo" },
];

export function describeRRule(rrule: string): string {
  const r = parseRRule(rrule);
  if (r.freq === "DAILY") return r.interval > 1 ? `Cada ${r.interval} días` : "Diario";
  if (r.freq === "WEEKLY") {
    if (!r.byday.length) return r.interval > 1 ? `Cada ${r.interval} semanas` : "Semanal";
    const days = r.byday.map((d) => WEEKDAYS_ES.find((w) => w.idx === d)?.short ?? "").join(",");
    return r.interval > 1 ? `Cada ${r.interval} sem. (${days})` : `Semanal (${days})`;
  }
  return rrule;
}
// Exportación .ics compatible con Google/Apple Calendar.

function pad(n: number) { return n.toString().padStart(2, "0"); }
function fmtUTC(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
function esc(s: string) { return (s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }

export interface ICSEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  durationMin: number;
  rrule?: string; // sin prefijo RRULE:
}

export function buildICS(events: ICSEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareCentral//ES",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    const end = new Date(e.start.getTime() + e.durationMin * 60_000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.uid}@carcentral.app`);
    lines.push(`DTSTAMP:${fmtUTC(new Date())}`);
    lines.push(`DTSTART:${fmtUTC(e.start)}`);
    lines.push(`DTEND:${fmtUTC(end)}`);
    lines.push(`SUMMARY:${esc(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`);
    if (e.rrule) lines.push(`RRULE:${e.rrule}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadICS(filename: string, events: ICSEvent[]) {
  const blob = new Blob([buildICS(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
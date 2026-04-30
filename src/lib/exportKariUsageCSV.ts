import type { KariUsageRow } from "@/hooks/useKariUsageAdmin";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportKariUsageCSV(rows: KariUsageRow[], from: string, to: string) {
  const header = [
    "user_id", "email", "full_name", "messages",
    "total_tokens", "cost_usd", "last_activity",
  ];
  const lines = rows.map((r) => [
    r.user_id, r.email ?? "", r.full_name ?? "", r.messages,
    r.total_tokens, (r.cost_usd_micros / 1_000_000).toFixed(6),
    r.last_activity,
  ].map(csvEscape).join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kari-uso_${from.slice(0, 10)}_${to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
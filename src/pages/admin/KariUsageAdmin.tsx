import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Download, Users, DollarSign, TrendingUp, Activity, Cpu } from "lucide-react";
import {
  useKariUsageSummary, useKariUsageByUser, useKariUsageDaily,
} from "@/hooks/useKariUsageAdmin";
import { exportKariUsageCSV } from "@/lib/exportKariUsageCSV";
import { KariMonthlyLimitsEditor } from "@/components/admin/KariMonthlyLimitsEditor";
import {
  useKariActiveModel,
  useSetKariActiveModel,
  KARI_MODEL_OPTIONS,
  useOcrActiveModel,
  useSetOcrActiveModel,
  OCR_MODEL_OPTIONS,
} from "@/hooks/useAiTokenPacks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

function formatUSD(micros: number) {
  return `$${(micros / 1_000_000).toFixed(2)}`;
}
function formatMXN(cents: number) {
  return `$${(cents / 100).toLocaleString("es-MX")}`;
}

export default function KariUsageAdmin() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(monthStart.toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date(today.getTime() + 86400000).toISOString().slice(0, 10));

  const fromIso = `${from}T00:00:00Z`;
  const toIso = `${to}T00:00:00Z`;

  const { data: summary } = useKariUsageSummary(fromIso, toIso);
  const { data: rows = [] } = useKariUsageByUser(fromIso, toIso, 200, 0);
  const { data: daily = [] } = useKariUsageDaily(fromIso, toIso);
  const [search, setSearch] = useState("");
  const { data: activeModel } = useKariActiveModel();
  const setModel = useSetKariActiveModel();
  const modelMeta = KARI_MODEL_OPTIONS.find((m) => m.value === activeModel);
  const { data: ocrModel } = useOcrActiveModel();
  const setOcrModel = useSetOcrActiveModel();
  const ocrMeta = OCR_MODEL_OPTIONS.find((m) => m.value === ocrModel);
  // Estimación de costo por escaneo OCR típico: ~3k tokens input + 2k output
  const ocrCostPerScanUsd = ocrMeta
    ? (3000 * ocrMeta.inputMicros + 2000 * ocrMeta.outputMicros) / 1_000_000
    : 0;
  const ocrCostPerScanMxn = ocrCostPerScanUsd * 18.5; // tipo de cambio aproximado

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.email ?? "").toLowerCase().includes(q) ||
      (r.full_name ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const margin = summary
    ? summary.revenue_cents / 100 - summary.cost_usd_micros / 1_000_000 * 17 // ~MXN/USD aprox
    : 0;

  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />Uso de Kari
        </h1>
        <p className="text-sm text-muted-foreground">Consumo, costo, margen y límites por usuario.</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <Button variant="outline" onClick={() => exportKariUsageCSV(filtered, fromIso, toIso)}>
            <Download className="h-4 w-4 mr-1" />Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm">Modelo de IA activo</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-3 items-end">
            <div>
              <Label className="text-xs">Modelo usado por Kari</Label>
              <Select
                value={activeModel}
                onValueChange={(v) => setModel.mutate(v)}
                disabled={setModel.isPending}
              >
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {KARI_MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label} — {m.note}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {modelMeta && (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div><span className="font-medium text-foreground">Costo input:</span> {modelMeta.inputMicros} µUSD/token (~${(modelMeta.inputMicros / 1_000_000 * 1000).toFixed(4)} USD/1k)</div>
                <div><span className="font-medium text-foreground">Costo output:</span> {modelMeta.outputMicros} µUSD/token (~${(modelMeta.outputMicros / 1_000_000 * 1000).toFixed(4)} USD/1k)</div>
                <p>El cambio aplica al siguiente mensaje enviado a Kari.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<Sparkles />} label="Tokens consumidos" value={summary?.tokens_consumed?.toLocaleString("es-MX") ?? "0"} />
        <KpiCard icon={<DollarSign />} label="Costo IA (USD)" value={formatUSD(summary?.cost_usd_micros ?? 0)} />
        <KpiCard icon={<TrendingUp />} label="Vendido (MXN)" value={formatMXN(summary?.revenue_cents ?? 0)} />
        <KpiCard icon={<Users />} label="Usuarios activos" value={String(summary?.active_users ?? 0)} />
        <KpiCard icon={<Activity />} label="Tokens vendidos" value={summary?.tokens_purchased?.toLocaleString("es-MX") ?? "0"} />
        <KpiCard icon={<TrendingUp />} label="Margen aprox (MXN)" value={`$${margin.toFixed(0)}`} />
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold mb-2 text-sm">Consumo diario</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="total_tokens" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm">Por usuario</h2>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar email o nombre…"
              className="max-w-xs h-9"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Usuario</th>
                  <th className="text-right py-2 px-2">Mensajes</th>
                  <th className="text-right py-2 px-2">Tokens</th>
                  <th className="text-right py-2 px-2">Costo USD</th>
                  <th className="text-left py-2 px-2">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-4">Sin datos.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.user_id} className="border-b last:border-0">
                    <td className="py-2 px-2">
                      <div className="font-medium truncate max-w-[280px]">{r.full_name || r.email || r.user_id}</div>
                      {r.full_name && <div className="text-[11px] text-muted-foreground truncate">{r.email}</div>}
                    </td>
                    <td className="text-right py-2 px-2 tabular-nums">{r.messages.toLocaleString("es-MX")}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{r.total_tokens.toLocaleString("es-MX")}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{formatUSD(r.cost_usd_micros)}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">
                      {new Date(r.last_activity).toLocaleString("es-MX")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <KariMonthlyLimitsEditor />
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-primary">{icon}</span>{label}
        </div>
        <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
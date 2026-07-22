import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { format } from "date-fns";

type MetricDef = {
  key: string;
  table: string;
  time: "measured_at" | "taken_at" | "fecha";
  label: string;
  unit: string;
  fields: { col: string; label: string; color: string }[];
};

const METRICS: MetricDef[] = [
  {
    key: "hr",
    table: "heart_rate_readings",
    time: "measured_at",
    label: "Frecuencia cardíaca",
    unit: "bpm",
    fields: [{ col: "bpm", label: "BPM", color: "hsl(var(--primary))" }],
  },
  {
    key: "spo2",
    table: "spo2_readings",
    time: "taken_at",
    label: "SpO₂",
    unit: "%",
    fields: [{ col: "spo2", label: "SpO₂", color: "hsl(199 89% 48%)" }],
  },
  {
    key: "bp",
    table: "blood_pressure_readings",
    time: "taken_at",
    label: "Presión arterial",
    unit: "mmHg",
    fields: [
      { col: "systolic", label: "Sistólica", color: "hsl(346 77% 49%)" },
      { col: "diastolic", label: "Diastólica", color: "hsl(217 91% 60%)" },
    ],
  },
  {
    key: "temp",
    table: "temperature_readings",
    time: "taken_at",
    label: "Temperatura",
    unit: "°C",
    fields: [{ col: "temperature_c", label: "°C", color: "hsl(24 95% 53%)" }],
  },
  {
    key: "glu",
    table: "glucose_readings",
    time: "taken_at",
    label: "Glucosa",
    unit: "mg/dL",
    fields: [{ col: "glucose_mg_dl", label: "mg/dL", color: "hsl(280 65% 55%)" }],
  },
];

function brandOf(name: string | null | undefined) {
  if (!name) return "Sin marca";
  return name.split(/[\s_-]/)[0];
}

export function ImportedChartsPanel() {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;

  const today = new Date();
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [from, setFrom] = useState(format(monthAgo, "yyyy-MM-dd"));
  const [to, setTo] = useState(format(today, "yyyy-MM-dd"));
  const [metricKey, setMetricKey] = useState<string>("hr");
  const [device, setDevice] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");

  const metric = METRICS.find((m) => m.key === metricKey)!;

  const q = useQuery({
    queryKey: ["imported-charts", patientId, metric.key, from, to],
    enabled: !!patientId,
    queryFn: async () => {
      const isDate = metric.time === "fecha";
      const gte = isDate ? from : new Date(from).toISOString();
      const lte = isDate ? to : new Date(to + "T23:59:59").toISOString();
      const cols = metric.fields.map((f) => f.col).join(", ");
      const { data, error } = await supabase
        .from(metric.table as any)
        .select(`${metric.time}, source, device_name, ${cols}`)
        .eq("patient_id", patientId!)
        .gte(metric.time, gte)
        .lte(metric.time, lte)
        .order(metric.time, { ascending: true })
        .limit(2000);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const rows = q.data ?? [];
  const allDevices = useMemo(
    () => Array.from(new Set(rows.map((r) => r.device_name).filter(Boolean))).sort() as string[],
    [rows]
  );
  const allBrands = useMemo(
    () => Array.from(new Set(allDevices.map(brandOf))).sort(),
    [allDevices]
  );

  const filtered = rows.filter((r) => {
    if (device !== "all" && r.device_name !== device) return false;
    if (brand !== "all" && brandOf(r.device_name) !== brand) return false;
    return true;
  });

  const chartData = filtered.map((r) => {
    const t = r[metric.time] as string;
    return {
      t,
      label: format(new Date(t.length > 10 ? t : t + "T00:00:00"), "dd/MM HH:mm"),
      ...Object.fromEntries(metric.fields.map((f) => [f.col, r[f.col]])),
    };
  });

  const stats = useMemo(() => {
    const primary = metric.fields[0].col;
    const vals = filtered.map((r) => Number(r[primary])).filter((v) => !isNaN(v));
    if (!vals.length) return null;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { min, max, avg, n: vals.length };
  }, [filtered, metric]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <LineChart className="h-4 w-4 text-primary" /> Gráficas interactivas por métrica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
          <div>
            <Label className="text-xs">Métrica</Label>
            <Select value={metricKey} onValueChange={setMetricKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METRICS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Marca</Label>
            <Select value={brand} onValueChange={(v) => { setBrand(v); setDevice("all"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {allBrands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Dispositivo</Label>
            <Select value={device} onValueChange={setDevice}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {allDevices
                  .filter((d) => brand === "all" || brandOf(d) === brand)
                  .map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{filtered.length} lecturas</Badge>
          {stats && (
            <>
              <Badge variant="outline">min {stats.min.toFixed(1)} {metric.unit}</Badge>
              <Badge variant="outline">prom {stats.avg.toFixed(1)} {metric.unit}</Badge>
              <Badge variant="outline">máx {stats.max.toFixed(1)} {metric.unit}</Badge>
            </>
          )}
        </div>

        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground rounded-md border border-dashed">
            Sin lecturas para los filtros seleccionados.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <RLineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={20} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {metric.fields.map((f) => (
                <Line
                  key={f.col}
                  type="monotone"
                  dataKey={f.col}
                  name={`${f.label} (${metric.unit})`}
                  stroke={f.color}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </RLineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
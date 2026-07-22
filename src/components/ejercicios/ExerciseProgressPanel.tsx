import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { estimate1RM } from "@/hooks/useExercises";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type SetRow = { created_at: string; weight_kg: number | null; reps: number | null; distance_m: number | null; duration_sec: number | null; session?: { fecha?: string } | null };

export function ExerciseProgressPanel({ sets }: { sets: SetRow[] }) {
  const [range, setRange] = useState(90);

  const daily = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - range);
    const map = new Map<string, { fecha: string; max_weight: number; volume: number; one_rm: number }>();
    for (const s of sets) {
      const fecha = s.session?.fecha ?? s.created_at.slice(0, 10);
      if (new Date(fecha) < since) continue;
      const row = map.get(fecha) ?? { fecha, max_weight: 0, volume: 0, one_rm: 0 };
      const w = s.weight_kg ?? 0, r = s.reps ?? 0;
      row.max_weight = Math.max(row.max_weight, w);
      row.volume += w * r;
      row.one_rm = Math.max(row.one_rm, estimate1RM(w, r));
      map.set(fecha, row);
    }
    return Array.from(map.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [sets, range]);

  const deltas = useMemo(() => {
    if (daily.length < 2) return null;
    const last = daily[daily.length - 1];
    const prev = daily[daily.length - 2];
    return {
      max_weight: last.max_weight - prev.max_weight,
      volume: last.volume - prev.volume,
      one_rm: last.one_rm - prev.one_rm,
    };
  }, [daily]);

  function DeltaBadge({ v, unit }: { v: number; unit: string }) {
    if (v > 0) return <Badge variant="secondary" className="gap-1 text-emerald-600"><TrendingUp className="h-3 w-3" /> +{v.toFixed(1)}{unit}</Badge>;
    if (v < 0) return <Badge variant="secondary" className="gap-1 text-destructive"><TrendingDown className="h-3 w-3" /> {v.toFixed(1)}{unit}</Badge>;
    return <Badge variant="outline" className="gap-1"><Minus className="h-3 w-3" /> sin cambio</Badge>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base">Panel de progreso</CardTitle>
        <Select value={String(range)} onValueChange={(v) => setRange(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="14">14 días</SelectItem>
            <SelectItem value="30">30 días</SelectItem>
            <SelectItem value="90">90 días</SelectItem>
            <SelectItem value="180">6 meses</SelectItem>
            <SelectItem value="365">1 año</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {deltas && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border p-2"><div className="text-muted-foreground">Peso máx</div><DeltaBadge v={deltas.max_weight} unit="kg" /></div>
            <div className="rounded-md border p-2"><div className="text-muted-foreground">Volumen</div><DeltaBadge v={deltas.volume} unit="" /></div>
            <div className="rounded-md border p-2"><div className="text-muted-foreground">1RM est.</div><DeltaBadge v={deltas.one_rm} unit="kg" /></div>
          </div>
        )}
        {daily.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Sin datos en el rango.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="fecha" tickFormatter={(v) => format(parseISO(v), "d MMM", { locale: es })} />
              <YAxis />
              <Tooltip labelFormatter={(v) => format(parseISO(v as string), "PPP", { locale: es })} />
              <Legend />
              <Line type="monotone" dataKey="max_weight" name="Peso máx (kg)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="one_rm" name="1RM est." stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="volume" name="Volumen" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
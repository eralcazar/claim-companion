import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TendenciaIndicador } from "@/hooks/useTendencias";

interface Props {
  indicadores: TendenciaIndicador[];
}

export const COMPARE_COLORS = [
  "hsl(var(--primary))",
  "hsl(25 95% 55%)",
  "hsl(265 80% 60%)",
];

function formatFecha(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM yy", { locale: es });
  } catch {
    return iso;
  }
}

type MergedPoint = {
  fechaIso: string;
  fechaLabel: string;
  [key: `valor_${number}`]: number | undefined;
};

export function IndicadorCompareChart({ indicadores }: Props) {
  const data = useMemo<MergedPoint[]>(() => {
    const map = new Map<string, MergedPoint>();
    indicadores.forEach((ind, idx) => {
      ind.puntos.forEach((p) => {
        const existing = map.get(p.fecha) ?? {
          fechaIso: p.fecha,
          fechaLabel: formatFecha(p.fecha),
        };
        (existing as any)[`valor_${idx}`] = p.valor;
        map.set(p.fecha, existing);
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.fechaIso.localeCompare(b.fechaIso),
    );
  }, [indicadores]);

  if (indicadores.length === 0) return null;

  // Axis assignment: idx 0 -> left, idx 1 & 2 -> right
  const leftLabel = indicadores[0]
    ? `${indicadores[0].nombre}${indicadores[0].unidad ? ` (${indicadores[0].unidad})` : ""}`
    : "";
  const rightIndicadores = indicadores.slice(1);
  const rightLabel = rightIndicadores
    .map((i) => `${i.nombre}${i.unidad ? ` (${i.unidad})` : ""}`)
    .join(" / ");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Comparación de indicadores</CardTitle>
        <p className="text-xs text-muted-foreground">
          Eje Y izquierdo: {indicadores[0]?.nombre}
          {rightIndicadores.length > 0 && ` · Eje Y derecho: ${rightIndicadores.map((i) => i.nombre).join(", ")}`}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="fechaLabel"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                label={{
                  value: leftLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))", textAnchor: "middle" },
                }}
              />
              {rightIndicadores.length > 0 && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  label={{
                    value: rightLabel,
                    angle: 90,
                    position: "insideRight",
                    style: { fontSize: 11, fill: "hsl(var(--muted-foreground))", textAnchor: "middle" },
                  }}
                />
              )}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md text-xs space-y-1">
                      <div className="font-medium">{label}</div>
                      {payload.map((entry: any) => {
                        const idx = parseInt(String(entry.dataKey).split("_")[1], 10);
                        const ind = indicadores[idx];
                        if (!ind || entry.value == null) return null;
                        return (
                          <div key={entry.dataKey} className="flex items-center gap-2">
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ background: entry.color }}
                            />
                            <span className="text-muted-foreground">{ind.nombre}:</span>
                            <span className="font-medium">
                              {entry.value}
                              {ind.unidad ? ` ${ind.unidad}` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value, entry: any) => {
                  const idx = parseInt(String(entry.dataKey).split("_")[1], 10);
                  const ind = indicadores[idx];
                  if (!ind) return value;
                  return `${ind.nombre}${ind.unidad ? ` (${ind.unidad})` : ""}`;
                }}
              />
              {indicadores.map((ind, idx) => (
                <Line
                  key={ind.nombre}
                  type="monotone"
                  dataKey={`valor_${idx}`}
                  yAxisId={idx === 0 ? "left" : "right"}
                  stroke={COMPARE_COLORS[idx]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  name={ind.nombre}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import type { ReadingKind, UnifiedReading } from "@/hooks/useUnifiedReadings";
import { KIND_LABEL } from "@/hooks/useUnifiedReadings";

export type ChartAppointment = {
  id: string;
  title?: string | null;
  appointment_date: string;
};

type Props = {
  readings: UnifiedReading[];
  kind: ReadingKind;
  appointments?: ChartAppointment[];
  /** Horas antes/después de la cita a resaltar (default 24). */
  windowHours?: number;
};

/** Serie temporal por tipo. Para BP dibuja SYS + DIA. */
export function UnifiedTimelineChart({
  readings,
  kind,
  appointments = [],
  windowHours = 24,
}: Props) {
  const data = useMemo(() => {
    return readings
      .filter((r) => r.kind === kind)
      .sort(
        (a, b) =>
          new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime(),
      )
      .map((r) => ({
        t: new Date(r.measured_at).getTime(),
        label: new Date(r.measured_at).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        primary: r.value,
        secondary: r.value2 ?? undefined,
        source: r.source,
      }));
  }, [readings, kind]);

  if (!data.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-lg">
        Sin lecturas de {KIND_LABEL[kind]} en el rango seleccionado.
      </div>
    );
  }

  const isBP = kind === "blood_pressure";
  const minT = data[0].t;
  const maxT = data[data.length - 1].t;
  const windowMs = windowHours * 3600 * 1000;

  const overlays = appointments
    .map((a) => {
      const at = new Date(a.appointment_date).getTime();
      return {
        id: a.id,
        title: a.title ?? "Cita",
        at,
        from: at - windowMs,
        to: at + windowMs,
      };
    })
    .filter((a) => a.to >= minT && a.from <= maxT);

  // Map appointment times to nearest reading label so ReferenceArea aligns on category axis.
  const nearestLabel = (target: number) => {
    let best = data[0];
    let bestDiff = Math.abs(data[0].t - target);
    for (const d of data) {
      const diff = Math.abs(d.t - target);
      if (diff < bestDiff) {
        best = d;
        bestDiff = diff;
      }
    }
    return best.label;
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v: any, n: any) => [v, n === "primary" ? (isBP ? "Sistólica" : KIND_LABEL[kind]) : "Diastólica"]}
        />
        <Legend />
        {overlays.map((o) => (
          <ReferenceArea
            key={`area-${o.id}`}
            x1={nearestLabel(o.from)}
            x2={nearestLabel(o.to)}
            fill="hsl(var(--accent))"
            fillOpacity={0.08}
            stroke="hsl(var(--accent))"
            strokeOpacity={0.25}
          />
        ))}
        {overlays.map((o) => (
          <ReferenceLine
            key={`line-${o.id}`}
            x={nearestLabel(o.at)}
            stroke="hsl(var(--accent))"
            strokeDasharray="4 4"
            label={{
              value: o.title.length > 14 ? o.title.slice(0, 14) + "…" : o.title,
              position: "top",
              fontSize: 10,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
        ))}
        <Line
          type="monotone"
          dataKey="primary"
          name={isBP ? "Sistólica" : KIND_LABEL[kind]}
          stroke="hsl(var(--primary))"
          dot={{ r: 2 }}
          strokeWidth={2}
        />
        {isBP && (
          <Line
            type="monotone"
            dataKey="secondary"
            name="Diastólica"
            stroke="hsl(var(--accent))"
            dot={{ r: 2 }}
            strokeWidth={2}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
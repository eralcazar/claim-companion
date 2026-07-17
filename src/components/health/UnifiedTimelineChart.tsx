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
} from "recharts";
import type { ReadingKind, UnifiedReading } from "@/hooks/useUnifiedReadings";
import { KIND_LABEL } from "@/hooks/useUnifiedReadings";

type Props = {
  readings: UnifiedReading[];
  kind: ReadingKind;
};

/** Serie temporal por tipo. Para BP dibuja SYS + DIA. */
export function UnifiedTimelineChart({ readings, kind }: Props) {
  const data = useMemo(() => {
    return readings
      .filter((r) => r.kind === kind)
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
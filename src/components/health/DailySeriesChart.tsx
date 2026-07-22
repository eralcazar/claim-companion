import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DailyPoint = { fecha: string; value: number };

interface Props {
  data: DailyPoint[];
  unit: string;
  color?: string;
  goal?: number | null;
  height?: number;
  emptyLabel?: string;
}

export function DailySeriesChart({
  data,
  unit,
  color = "hsl(var(--primary))",
  goal,
  height = 260,
  emptyLabel = "Sin lecturas en este rango.",
}: Props) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground rounded-md border border-dashed"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.fecha + "T00:00:00").toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
    }),
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formatted} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString("es-MX")} ${unit}`, "Valor"]}
          labelFormatter={(l) => `Día ${l}`}
          contentStyle={{ fontSize: 12 }}
        />
        {goal != null && goal > 0 && (
          <ReferenceLine
            y={goal}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{ value: `Meta ${goal}`, fontSize: 10, position: "right" }}
          />
        )}
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
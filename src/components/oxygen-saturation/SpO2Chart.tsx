import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useSpO2Readings } from "@/hooks/useOxygenSaturation";

export function SpO2Chart() {
  const { user } = useAuth();
  const { data, isLoading } = useSpO2Readings(user?.id);

  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data]
      .sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
      .map((r) => ({
        time: format(new Date(r.taken_at), "dd MMM HH:mm", { locale: es }),
        SpO2: r.spo2,
        Pulso: r.pulse,
      }));
  }, [data]);

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando tendencias...</p>;
  }

  if (chartData.length === 0) {
    return <p className="text-muted-foreground">No hay datos suficientes para graficar.</p>;
  }

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 16, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis
            yAxisId="spo2"
            domain={[80, 100]}
            tick={{ fontSize: 12 }}
            label={{ value: "SpO2 (%)", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
          />
          <YAxis
            yAxisId="pulse"
            orientation="right"
            domain={[40, 160]}
            tick={{ fontSize: 12 }}
            label={{ value: "Pulso (bpm)", angle: 90, position: "insideRight", style: { fontSize: 12 } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              color: "hsl(var(--popover-foreground))",
            }}
          />
          <Legend />
          <ReferenceLine yAxisId="spo2" y={95} stroke="hsl(var(--success))" strokeDasharray="4 4" label={{ value: "Normal ≥95", fontSize: 10, fill: "hsl(var(--success))" }} />
          <ReferenceLine yAxisId="spo2" y={90} stroke="hsl(var(--warning))" strokeDasharray="4 4" label={{ value: "Bajo <90", fontSize: 10, fill: "hsl(var(--warning))" }} />
          <Line
            yAxisId="spo2"
            type="monotone"
            dataKey="SpO2"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="pulse"
            type="monotone"
            dataKey="Pulso"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
            dot={{ r: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
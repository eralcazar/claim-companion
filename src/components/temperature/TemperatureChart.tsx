import { useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useTemperatureReadings } from "@/hooks/useTemperature";

export function TemperatureChart({ patientId }: { patientId: string }) {
  const { data, isLoading } = useTemperatureReadings(patientId);
  const chartData = useMemo(() => {
    if (!data) return [];
    return [...data]
      .sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
      .map((r) => ({
        time: format(new Date(r.taken_at), "dd MMM HH:mm", { locale: es }),
        Temperatura: Number(r.temperature_c),
      }));
  }, [data]);

  if (isLoading) return <p className="text-muted-foreground">Cargando tendencias...</p>;
  if (chartData.length === 0) return <p className="text-muted-foreground">No hay datos suficientes para graficar.</p>;

  return (
    <div className="w-full h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 16, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis domain={[34, 41]} tick={{ fontSize: 12 }} label={{ value: "°C", angle: -90, position: "insideLeft", style: { fontSize: 12 } }} />
          <Tooltip contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            color: "hsl(var(--popover-foreground))",
          }} />
          <ReferenceLine y={37.5} stroke="hsl(var(--warning))" strokeDasharray="4 4" label={{ value: "Febrícula 37.5", fontSize: 10, fill: "hsl(var(--warning))" }} />
          <ReferenceLine y={38} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Fiebre 38", fontSize: 10, fill: "hsl(var(--destructive))" }} />
          <ReferenceLine y={35} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Hipotermia 35", fontSize: 10, fill: "hsl(var(--destructive))" }} />
          <Line type="monotone" dataKey="Temperatura" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
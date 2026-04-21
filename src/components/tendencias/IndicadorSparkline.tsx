import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useIndicadorHistory } from "@/hooks/useTendencias";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  patientId: string;
  nombreIndicador: string;
}

function fmt(iso: string) {
  try {
    return format(new Date(iso), "dd MMM yy", { locale: es });
  } catch {
    return iso;
  }
}

const TinyTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-xs shadow-md">
      <div className="font-medium">{p.valor}</div>
      <div className="text-muted-foreground">{fmt(p.fecha)}</div>
    </div>
  );
};

export function IndicadorSparkline({ patientId, nombreIndicador }: Props) {
  const { data: puntos = [], isLoading } = useIndicadorHistory(patientId, nombreIndicador);

  if (isLoading) {
    return <Skeleton className="h-8 w-[120px]" />;
  }

  if (puntos.length < 2) {
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1 w-[120px]">
        <Minus className="h-3 w-3" /> 1ª medición
      </span>
    );
  }

  const last = puntos[puntos.length - 1];
  const prev = puntos[puntos.length - 2];
  const delta = last.valor - prev.valor;
  const pct = prev.valor !== 0 ? (delta / Math.abs(prev.valor)) * 100 : 0;
  const goingUp = delta > 0;
  const isAbnormal = last.es_normal === false;

  // Color: red if last value out of range, orange if rising, green if stable/falling
  const color = isAbnormal
    ? "hsl(var(--destructive))"
    : goingUp
    ? "hsl(38 92% 50%)"
    : "hsl(142 71% 45%)";

  const values = puntos.map((p) => p.valor);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.15 || 1;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="h-8 w-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={puntos} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <YAxis hide domain={[min - pad, max + pad]} />
            <Tooltip content={<TinyTooltip />} cursor={false} />
            <Line
              type="monotone"
              dataKey="valor"
              stroke={color}
              strokeWidth={1.5}
              dot={{ r: 1.5, fill: color }}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span
        className="text-[10px] font-medium inline-flex items-center gap-0.5 tabular-nums"
        style={{ color }}
      >
        {goingUp ? (
          <TrendingUp className="h-3 w-3" />
        ) : delta < 0 ? (
          <TrendingDown className="h-3 w-3" />
        ) : (
          <Minus className="h-3 w-3" />
        )}
        {delta === 0 ? "0%" : `${goingUp ? "+" : ""}${pct.toFixed(0)}%`}
      </span>
    </div>
  );
}
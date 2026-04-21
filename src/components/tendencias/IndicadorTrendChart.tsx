import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  Dot,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { TendenciaIndicador } from "@/hooks/useTendencias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface Props {
  indicador: TendenciaIndicador;
}

function formatFecha(iso: string) {
  try {
    return format(parseISO(iso), "dd MMM yy", { locale: es });
  } catch {
    return iso;
  }
}

const AbnormalDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const fuera = payload.es_normal === false;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={fuera ? 5 : 4}
      fill={fuera ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
  );
};

export function IndicadorTrendChart({ indicador }: Props) {
  const { nombre, unidad, ref_min, ref_max, puntos } = indicador;

  const data = puntos.map((p) => ({
    fechaLabel: formatFecha(p.fecha),
    fechaIso: p.fecha,
    valor: p.valor,
    es_normal: p.es_normal,
    tipo_estudio: p.tipo_estudio,
  }));

  // Tendencia entre primer y último punto.
  const first = puntos[0]?.valor;
  const last = puntos[puntos.length - 1]?.valor;
  const delta = first != null && last != null ? last - first : 0;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendColor =
    delta === 0
      ? "text-muted-foreground"
      : ref_min != null && ref_max != null
      ? "text-foreground"
      : "text-foreground";

  // Eje Y: incluir rango de referencia si existe.
  const valores = puntos.map((p) => p.valor);
  const minVal = Math.min(...valores, ref_min ?? Infinity);
  const maxVal = Math.max(...valores, ref_max ?? -Infinity);
  const padding = (maxVal - minVal) * 0.15 || 1;
  const yMin = Number((minVal - padding).toFixed(2));
  const yMax = Number((maxVal + padding).toFixed(2));

  const ultimoFueraRango = puntos[puntos.length - 1]?.es_normal === false;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{nombre}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {puntos.length} {puntos.length === 1 ? "medición" : "mediciones"}
              {unidad ? ` · ${unidad}` : ""}
              {ref_min != null && ref_max != null ? ` · Ref: ${ref_min}–${ref_max}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ultimoFueraRango && (
              <Badge variant="destructive" className="text-xs">
                Fuera de rango
              </Badge>
            )}
            <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              {last != null ? last : "—"}
              {unidad && <span className="text-xs text-muted-foreground">{unidad}</span>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="fechaLabel"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                domain={[yMin, yMax]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                width={40}
              />
              {ref_min != null && ref_max != null && (
                <ReferenceArea
                  y1={ref_min}
                  y2={ref_max}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.08}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.2}
                  strokeDasharray="2 4"
                />
              )}
              {ref_min != null && (
                <ReferenceLine
                  y={ref_min}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.4}
                  strokeDasharray="3 3"
                />
              )}
              {ref_max != null && (
                <ReferenceLine
                  y={ref_max}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.4}
                  strokeDasharray="3 3"
                />
              )}
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                formatter={(value: any, _name, props: any) => {
                  const fuera = props?.payload?.es_normal === false;
                  return [
                    `${value}${unidad ? ` ${unidad}` : ""}${fuera ? " · ⚠ fuera de rango" : ""}`,
                    nombre,
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={<AbnormalDot />}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, AlertTriangle } from "lucide-react";

type ByModelRow = {
  model: string;
  requests: number;
  total_tokens: number;
  cost_estimated_micros: number;
  gateway_credits: number;
  gateway_cost_cents: number;
  matched_requests: number;
};

type ByFeatureRow = {
  feature_key: string;
  requests: number;
  total_tokens: number;
  cost_estimated_micros: number;
  gateway_credits: number;
  gateway_cost_cents: number;
  matched_requests: number;
};

function fmtUsd(micros: number) {
  return `$${(Number(micros ?? 0) / 1_000_000).toFixed(4)}`;
}
function fmtCents(cents: number) {
  return `$${(Number(cents ?? 0) / 100).toFixed(4)}`;
}
function fmtCredits(c: number) {
  return Number(c ?? 0).toLocaleString("es-MX", { maximumFractionDigits: 3 });
}

export function UsageComparisonPanel({
  fromIso,
  toIso,
  userId,
}: {
  fromIso: string;
  toIso: string;
  userId?: string | null;
}) {
  const { data: byModel = [], isLoading: l1 } = useQuery({
    queryKey: ["usage-cmp-model", fromIso, toIso, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_kari_usage_comparison_by_model", {
        _from: fromIso,
        _to: toIso,
        _user_id: userId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as ByModelRow[];
    },
  });

  const { data: byFeature = [], isLoading: l2 } = useQuery({
    queryKey: ["usage-cmp-feature", fromIso, toIso, userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_kari_usage_comparison_by_feature", {
        _from: fromIso,
        _to: toIso,
        _user_id: userId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as ByFeatureRow[];
    },
  });

  const totalMatched = byModel.reduce((a, r) => a + Number(r.matched_requests || 0), 0);
  const totalRequests = byModel.reduce((a, r) => a + Number(r.requests || 0), 0);
  const coverage = totalRequests ? Math.round((totalMatched / totalRequests) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Comparativa: consumo estimado vs cobro real de Lovable</h2>
          <Badge variant={coverage >= 80 ? "default" : "secondary"} className="ml-auto">
            {coverage}% con costo real
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          El costo estimado se calcula al vuelo con la tarifa del modelo. El costo real (créditos y centavos) se
          importa desde el CSV de <em>Workspace → Uso</em> de Lovable.
        </p>

        {coverage < 80 && totalRequests > 0 && (
          <div className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              Faltan {totalRequests - totalMatched} peticiones sin costo real importado. Sube el CSV desde el panel
              &quot;Importar costos reales&quot; para completar la comparativa.
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">Por modelo</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Modelo</th>
                  <th className="text-right py-2 px-2">Peticiones</th>
                  <th className="text-right py-2 px-2">Tokens</th>
                  <th className="text-right py-2 px-2">Estimado (USD)</th>
                  <th className="text-right py-2 px-2">Real Lovable (créditos)</th>
                  <th className="text-right py-2 px-2">Real Lovable ($)</th>
                  <th className="text-right py-2 px-2">Δ %</th>
                </tr>
              </thead>
              <tbody>
                {l1 && (
                  <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Cargando…</td></tr>
                )}
                {!l1 && byModel.length === 0 && (
                  <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">Sin datos.</td></tr>
                )}
                {byModel.map((r) => {
                  const est = Number(r.cost_estimated_micros) / 1_000_000;
                  const real = Number(r.gateway_cost_cents) / 100;
                  const delta = est > 0 && real > 0 ? ((real - est) / est) * 100 : null;
                  return (
                    <tr key={r.model} className="border-b last:border-0">
                      <td className="py-2 px-2 font-mono text-xs">{r.model}</td>
                      <td className="text-right py-2 px-2 tabular-nums">{Number(r.requests).toLocaleString("es-MX")}</td>
                      <td className="text-right py-2 px-2 tabular-nums">{Number(r.total_tokens).toLocaleString("es-MX")}</td>
                      <td className="text-right py-2 px-2 tabular-nums">{fmtUsd(r.cost_estimated_micros)}</td>
                      <td className="text-right py-2 px-2 tabular-nums">{fmtCredits(r.gateway_credits)}</td>
                      <td className="text-right py-2 px-2 tabular-nums">{fmtCents(r.gateway_cost_cents)}</td>
                      <td className={`text-right py-2 px-2 tabular-nums ${delta && Math.abs(delta) > 20 ? "text-amber-600" : ""}`}>
                        {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">Por asistente (feature)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Feature</th>
                  <th className="text-right py-2 px-2">Peticiones</th>
                  <th className="text-right py-2 px-2">Tokens</th>
                  <th className="text-right py-2 px-2">Estimado (USD)</th>
                  <th className="text-right py-2 px-2">Real ($)</th>
                </tr>
              </thead>
              <tbody>
                {l2 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Cargando…</td></tr>}
                {!l2 && byFeature.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Sin datos.</td></tr>
                )}
                {byFeature.map((r) => (
                  <tr key={r.feature_key} className="border-b last:border-0">
                    <td className="py-2 px-2">{r.feature_key}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{Number(r.requests).toLocaleString("es-MX")}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{Number(r.total_tokens).toLocaleString("es-MX")}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{fmtUsd(r.cost_estimated_micros)}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{fmtCents(r.gateway_cost_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
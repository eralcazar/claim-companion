import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Sparkles, Download, AlertTriangle } from "lucide-react";
import {
  AI_FEATURES,
  useMyFeatureConsents,
  useSetFeatureConsent,
  useAiAudit,
  exportAiAuditCSV,
  useExternalProvidersEnabled,
  useAiPolicyProviders,
} from "@/hooks/useAiGovernance";
import { useState } from "react";

export default function MisDatosIA() {
  const { data: consents = [] } = useMyFeatureConsents();
  const setConsent = useSetFeatureConsent();
  const { data: externalsOn } = useExternalProvidersEnabled();
  const { data: providers } = useAiPolicyProviders();

  const [days, setDays] = useState(30);
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const { data: audit = [] } = useAiAudit({ from: fromIso, to: toIso, onlyMine: true });

  const consentByKey = new Map(consents.map((c) => [c.feature_key, c]));

  const providersSeen = Array.from(new Set(audit.map((a) => a.provider)));

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Mis datos y IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Controla qué funciones de inteligencia artificial pueden procesar tus datos y con qué proveedor.
          Puedes revocar el consentimiento en cualquier momento y ver el historial de llamadas.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm">Consentimientos por función</h2>
            <Badge variant="outline" className="ml-auto">
              Proveedor por defecto: Lovable AI
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Por defecto solo usamos <strong>Lovable AI</strong> (Google Gemini). Si administración
            habilita un proveedor externo, tu decisión aquí manda: si está desactivado, tus datos
            nunca salen hacia ese proveedor.
          </p>
          {!externalsOn && (
            <div className="flex items-start gap-2 rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs">
              <Shield className="h-4 w-4 text-emerald-600 mt-0.5" />
              <span>
                El kill switch de administración está <strong>activo</strong>: ningún proveedor externo
                puede recibir datos ahora mismo, independientemente de estos consentimientos.
              </span>
            </div>
          )}

          <div className="divide-y">
            {AI_FEATURES.map((f) => {
              const c = consentByKey.get(f.key);
              const configuredProvider = providers?.get(f.key) ?? "lovable";
              const isExternal = configuredProvider !== "lovable";
              // Opt-in por defecto en Lovable; opt-out por defecto en externo.
              const granted = c?.granted ?? !isExternal;
              return (
                <div key={f.key} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm flex items-center gap-2">
                      {f.label}
                      {isExternal ? (
                        <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40">
                          Proveedor externo · {configuredProvider}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Siempre interno</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isExternal
                        ? "Al activar, tus prompts (sin CURP, RFC, email, teléfono, direcciones ni fechas) salen a este proveedor. Si desactivas, se usa Lovable AI automáticamente."
                        : "Esta función usa exclusivamente Lovable AI (interno). No hay envío a terceros."}
                    </div>
                  </div>
                  {isExternal ? (
                    <Switch
                      checked={granted}
                      disabled={setConsent.isPending}
                      onCheckedChange={(v) =>
                        setConsent.mutate({ feature_key: f.key, granted: v, provider: configuredProvider })
                      }
                    />
                  ) : (
                    <span className="text-[11px] text-muted-foreground">sin decisión</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold text-sm">Historial de llamadas a IA con mis datos</h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={90}>Últimos 90 días</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportAiAuditCSV(audit, fromIso, toIso)}
                disabled={audit.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />CSV
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {audit.length} llamada(s) en el rango · proveedores usados:{" "}
            {providersSeen.length > 0 ? providersSeen.join(", ") : "ninguno"}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Fecha</th>
                  <th className="text-left py-2 px-2">Función</th>
                  <th className="text-left py-2 px-2">Proveedor</th>
                  <th className="text-center py-2 px-2">PII sanitizada</th>
                  <th className="text-left py-2 px-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {audit.slice(0, 100).map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-1.5 px-2">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                    <td className="py-1.5 px-2">{r.feature_key}</td>
                    <td className="py-1.5 px-2">{r.provider}</td>
                    <td className="text-center py-1.5 px-2">{r.sanitized ? "✓" : "—"}</td>
                    <td className="py-1.5 px-2">{r.status}</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground py-4">Sin llamadas en el rango.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
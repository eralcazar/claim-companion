import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSearch } from "lucide-react";
import { useAiAudit, exportAiAuditCSV, AI_FEATURES } from "@/hooks/useAiGovernance";

export function AiAuditExport() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(monthStart.toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date(today.getTime() + 86400000).toISOString().slice(0, 10));
  const [feature, setFeature] = useState<string>("__all__");
  const [provider, setProvider] = useState<string>("__all__");

  const fromIso = `${from}T00:00:00Z`;
  const toIso = `${to}T00:00:00Z`;
  const { data: rows = [], isLoading } = useAiAudit({
    from: fromIso,
    to: toIso,
    feature: feature === "__all__" ? undefined : feature,
    provider: provider === "__all__" ? undefined : provider,
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Auditoría de llamadas a IA</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          Filtra por fecha, feature y proveedor. La exportación incluye el prompt sanitizado,
          los campos de PII detectados, la razón de bloqueo y si se forzó fallback.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Feature</Label>
            <Select value={feature} onValueChange={setFeature}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {AI_FEATURES.map((f) => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Proveedor</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="lovable">Lovable AI</SelectItem>
                <SelectItem value="apifreellm">ApiFreeLLM</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => exportAiAuditCSV(rows, fromIso, toIso)}
            disabled={isLoading || rows.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar CSV ({rows.length})
          </Button>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left py-2 px-2">Fecha</th>
                <th className="text-left py-2 px-2">Feature</th>
                <th className="text-left py-2 px-2">Proveedor</th>
                <th className="text-left py-2 px-2">Modelo</th>
                <th className="text-center py-2 px-2">Sanit.</th>
                <th className="text-left py-2 px-2">PII detectada</th>
                <th className="text-left py-2 px-2">Motivo bloqueo</th>
                <th className="text-center py-2 px-2">Fallback</th>
                <th className="text-left py-2 px-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-1.5 px-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                  <td className="py-1.5 px-2">{r.feature_key}</td>
                  <td className="py-1.5 px-2">{r.provider}</td>
                  <td className="py-1.5 px-2 truncate max-w-[180px]">{r.model ?? "—"}</td>
                  <td className="text-center py-1.5 px-2">{r.sanitized ? "✓" : "—"}</td>
                  <td className="py-1.5 px-2 truncate max-w-[160px]">
                    {(r.pii_fields_detected ?? []).join(", ") || "—"}
                  </td>
                  <td className="py-1.5 px-2">{r.blocked_reason ?? "—"}</td>
                  <td className="text-center py-1.5 px-2">{r.fallback_used ? "✓" : "—"}</td>
                  <td className="py-1.5 px-2">{r.status}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted-foreground py-4">Sin registros en el rango seleccionado.</td></tr>
              )}
            </tbody>
          </table>
          {rows.length > 50 && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Mostrando 50 de {rows.length}. La exportación CSV incluye todos.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
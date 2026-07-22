import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import {
  useExternalProvidersEnabled,
  useSetExternalProvidersEnabled,
} from "@/hooks/useAiGovernance";

export function AiKillSwitch() {
  const { data: enabled = false, isLoading } = useExternalProvidersEnabled();
  const setEnabled = useSetExternalProvidersEnabled();

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          {enabled ? (
            <ShieldAlert className="h-5 w-5 text-orange-500" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          )}
          <h2 className="font-semibold text-sm">Kill switch — proveedores externos de IA</h2>
          <Badge variant={enabled ? "outline" : "default"} className="ml-auto">
            {enabled ? "Externos habilitados" : "Solo Lovable AI"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Desactiva al instante cualquier proveedor externo (ApiFreeLLM u otros). Toma efecto en
          la siguiente llamada sin redeploy. Los usuarios sin consentimiento activo tampoco
          verán llamadas a externos aunque este switch esté encendido.
        </p>
        <div className="flex items-center gap-3">
          <Switch
            id="killswitch"
            checked={enabled}
            disabled={isLoading || setEnabled.isPending}
            onCheckedChange={(v) => setEnabled.mutate(v)}
          />
          <Label htmlFor="killswitch" className="text-sm">
            Permitir proveedores externos
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import {
  useKariMonthlyLimits, useUpsertKariLimit, useDeleteKariLimit,
} from "@/hooks/useKariUsageAdmin";
import { usePlans } from "@/hooks/usePlans";

const ROLES = ["admin", "broker", "paciente", "medico", "enfermero", "laboratorio", "farmacia"] as const;

export function KariMonthlyLimitsEditor() {
  const { data: limits = [] } = useKariMonthlyLimits();
  const { data: plans = [] } = usePlans();
  const upsert = useUpsertKariLimit();
  const del = useDeleteKariLimit();

  const [draft, setDraft] = useState({
    plan_id: null as string | null,
    role: "paciente" as (typeof ROLES)[number],
    monthly_token_cap: 5000,
    enabled: true,
  });

  const planName = (id: string | null) => id ? plans.find((p: any) => p.id === id)?.nombre ?? "—" : "Todos los paquetes";

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold">Límites mensuales de tokens</h3>
          <p className="text-xs text-muted-foreground">
            Tope de tokens consumidos por mes según rol y paquete. Si no hay regla, no hay tope.
          </p>
        </div>

        <div className="space-y-2">
          {limits.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin límites configurados.</p>
          )}
          {limits.map((l) => (
            <div key={l.id} className="flex items-center gap-2 border rounded-md p-2 text-sm">
              <span className="font-medium w-24 truncate">{l.role}</span>
              <span className="flex-1 text-muted-foreground truncate">{planName(l.plan_id)}</span>
              <Input
                type="number"
                value={l.monthly_token_cap}
                onChange={(e) => upsert.mutate({ ...l, monthly_token_cap: Number(e.target.value || 0) })}
                className="w-28 h-8"
              />
              <Switch
                checked={l.enabled}
                onCheckedChange={(v) => upsert.mutate({ ...l, enabled: v })}
              />
              <Button variant="ghost" size="icon" onClick={() => del.mutate(l.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t pt-3 space-y-2">
          <h4 className="text-sm font-medium">Agregar regla</h4>
          <div className="grid sm:grid-cols-4 gap-2 items-end">
            <div>
              <Label className="text-xs">Rol</Label>
              <Select value={draft.role} onValueChange={(v) => setDraft((d) => ({ ...d, role: v as any }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paquete</Label>
              <Select
                value={draft.plan_id ?? "ALL"}
                onValueChange={(v) => setDraft((d) => ({ ...d, plan_id: v === "ALL" ? null : v }))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los paquetes</SelectItem>
                  {plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tope mensual</Label>
              <Input
                type="number"
                value={draft.monthly_token_cap}
                onChange={(e) => setDraft((d) => ({ ...d, monthly_token_cap: Number(e.target.value || 0) }))}
                className="h-9"
              />
            </div>
            <Button
              onClick={() => upsert.mutate(draft)}
              disabled={upsert.isPending}
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1" />Agregar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
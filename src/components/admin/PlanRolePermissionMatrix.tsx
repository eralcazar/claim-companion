import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { AVAILABLE_FEATURES, ALL_ROLES, type AppRoleLite, type FeatureKey } from "@/lib/features";
import { Layers, ChevronDown } from "lucide-react";
import type { RolePermissionRow } from "@/hooks/usePermissions";

const ROLE_LABEL: Record<AppRoleLite, string> = {
  admin: "Admin",
  broker: "Broker",
  paciente: "Paciente",
  medico: "Médico",
  enfermero: "Enfermero",
  laboratorio: "Laboratorio",
  farmacia: "Farmacia",
};

interface Plan {
  id: string;
  nombre: string;
}

interface PlanRoleFeatureRow {
  plan_id: string;
  role: AppRoleLite;
  feature_key: string;
  allowed: boolean;
}

export function PlanRolePermissionMatrix({ permissions }: { permissions: RolePermissionRow[] }) {
  const qc = useQueryClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["subscription_plans_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, nombre")
        .order("orden");
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  const { data: matrix } = useQuery({
    queryKey: ["plan_role_features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_role_features")
        .select("plan_id, role, feature_key, allowed");
      if (error) throw error;
      return (data ?? []) as PlanRoleFeatureRow[];
    },
  });

  const cellMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    (matrix ?? []).forEach((r) => {
      if (!r.allowed) return;
      const k = `${r.role}:${r.feature_key}`;
      if (!m.has(k)) m.set(k, new Set());
      m.get(k)!.add(r.plan_id);
    });
    return m;
  }, [matrix]);

  const rolePermAllowed = useMemo(() => {
    const s = new Set<string>();
    permissions.forEach((p) => p.allowed && s.add(`${p.role}:${p.feature_key}`));
    return s;
  }, [permissions]);

  const setPlans = async (
    role: AppRoleLite,
    feature: FeatureKey,
    nextPlanIds: string[],
  ) => {
    const k = `${role}:${feature}`;
    setSavingKey(k);
    try {
      // Delete existing rows for this (role, feature)
      const { error: delErr } = await supabase
        .from("plan_role_features")
        .delete()
        .eq("role", role)
        .eq("feature_key", feature);
      if (delErr) throw delErr;

      if (nextPlanIds.length > 0) {
        const rows = nextPlanIds.map((plan_id) => ({
          plan_id,
          role,
          feature_key: feature,
          allowed: true,
        }));
        const { error: insErr } = await supabase.from("plan_role_features").insert(rows);
        if (insErr) throw insErr;
      }
      qc.invalidateQueries({ queryKey: ["plan_role_features"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "No se pudo guardar", variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  };

  if (!plans) return <p className="text-muted-foreground">Cargando paquetes...</p>;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Función</TableHead>
            {ALL_ROLES.map((r) => (
              <TableHead key={r} className="text-center min-w-[140px]">{ROLE_LABEL[r]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {AVAILABLE_FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <TableRow key={feat.key}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{feat.label}</span>
                  </div>
                </TableCell>
                {ALL_ROLES.map((role) => {
                  const k = `${role}:${feat.key}`;
                  const baseAllowed = rolePermAllowed.has(k);
                  const selectedPlans = Array.from(cellMap.get(k) ?? []);
                  const isOpen = !baseAllowed;
                  return (
                    <TableCell key={role} className="text-center">
                      {!baseAllowed ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              disabled={savingKey === k}
                            >
                              <Layers className="h-3.5 w-3.5" />
                              {selectedPlans.length === 0 ? (
                                <span className="text-xs">Todos</span>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] h-4">
                                  {selectedPlans.length}
                                </Badge>
                              )}
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3" align="end">
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold">
                                Paquetes con acceso
                              </Label>
                              <p className="text-[11px] text-muted-foreground">
                                Si no eliges ninguno, el acceso aplica a todos los paquetes.
                              </p>
                              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                {plans.map((p) => {
                                  const checked = selectedPlans.includes(p.id);
                                  return (
                                    <label
                                      key={p.id}
                                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={(c) => {
                                          const next = c
                                            ? [...selectedPlans, p.id]
                                            : selectedPlans.filter((x) => x !== p.id);
                                          setPlans(role, feat.key, next);
                                        }}
                                      />
                                      <span>{p.nombre}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
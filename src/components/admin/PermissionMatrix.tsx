import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AVAILABLE_FEATURES, ALL_ROLES, type AppRoleLite, type FeatureKey } from "@/lib/features";
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

export function PermissionMatrix({ permissions }: { permissions: RolePermissionRow[] }) {
  const qc = useQueryClient();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const allowedMap = new Map<string, boolean>();
  permissions.forEach((p) => allowedMap.set(`${p.role}:${p.feature_key}`, p.allowed));

  const toggle = async (role: AppRoleLite, feature: FeatureKey, checked: boolean) => {
    const key = `${role}:${feature}`;
    setPendingKey(key);
    try {
      const { error } = await supabase
        .from("role_permissions")
        .upsert(
          { role, feature_key: feature, allowed: checked },
          { onConflict: "role,feature_key" },
        );
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["role_permissions"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "No se pudo actualizar", variant: "destructive" });
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Función</TableHead>
            {ALL_ROLES.map((r) => (
              <TableHead key={r} className="text-center">{ROLE_LABEL[r]}</TableHead>
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
                  const checked = allowedMap.get(k) ?? false;
                  return (
                    <TableCell key={role} className="text-center">
                      <Switch
                        checked={checked}
                        onCheckedChange={(c) => toggle(role, feat.key, c)}
                        disabled={pendingKey === k}
                        aria-label={`${feat.label} - ${ROLE_LABEL[role]}`}
                      />
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
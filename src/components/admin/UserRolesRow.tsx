import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ALL_ROLES, type AppRoleLite } from "@/lib/features";
import { useQueryClient } from "@tanstack/react-query";

interface UserWithRoles {
  user_id: string;
  full_name: string;
  email: string | null;
  roles: AppRoleLite[];
}

const ROLE_LABEL: Record<AppRoleLite, string> = {
  admin: "Admin",
  broker: "Broker",
  paciente: "Paciente",
  medico: "Médico",
};

export function UserRolesRow({ user }: { user: UserWithRoles }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<AppRoleLite | null>(null);
  const [localRoles, setLocalRoles] = useState<AppRoleLite[]>(user.roles);

  const toggleRole = async (role: AppRoleLite, checked: boolean) => {
    setPending(role);
    try {
      if (checked) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: user.user_id, role });
        if (error && !error.message.includes("duplicate")) throw error;
        setLocalRoles((r) => Array.from(new Set([...r, role])));
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.user_id)
          .eq("role", role);
        if (error) throw error;
        setLocalRoles((r) => r.filter((x) => x !== role));
      }
      qc.invalidateQueries({ queryKey: ["users_with_roles"] });
      toast({ title: "Rol actualizado", description: `${ROLE_LABEL[role]} ${checked ? "asignado" : "removido"}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "No se pudo actualizar", variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{user.full_name || "(sin nombre)"}</TableCell>
      <TableCell className="text-muted-foreground">{user.email || "—"}</TableCell>
      {ALL_ROLES.map((role) => (
        <TableCell key={role} className="text-center">
          <div className="flex flex-col items-center gap-1">
            <Switch
              checked={localRoles.includes(role)}
              onCheckedChange={(c) => toggleRole(role, c)}
              disabled={pending === role}
              aria-label={`${ROLE_LABEL[role]} para ${user.full_name}`}
            />
            <span className="text-xs text-muted-foreground md:hidden">{ROLE_LABEL[role]}</span>
          </div>
        </TableCell>
      ))}
    </TableRow>
  );
}
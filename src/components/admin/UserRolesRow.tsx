import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ALL_ROLES, type AppRoleLite } from "@/lib/features";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserWithRoles {
  user_id: string;
  full_name: string;
  email: string | null;
  roles: AppRoleLite[];
}

interface BrokerOption {
  user_id: string;
  full_name: string;
}

const ROLE_LABEL: Record<AppRoleLite, string> = {
  admin: "Admin",
  broker: "Broker",
  paciente: "Paciente",
  medico: "Médico",
};

export function UserRolesRow({
  user,
  brokers,
  assignedBrokerId,
  isSelf,
}: {
  user: UserWithRoles;
  brokers: BrokerOption[];
  assignedBrokerId: string | null;
  isSelf: boolean;
}) {
  const qc = useQueryClient();
  const [pending, setPending] = useState<AppRoleLite | null>(null);
  const [localRoles, setLocalRoles] = useState<AppRoleLite[]>(user.roles);
  const [assignedBroker, setAssignedBroker] = useState<string>(assignedBrokerId ?? "__none__");
  const [savingBroker, setSavingBroker] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", user_id: user.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries({ queryKey: ["users_with_roles"] });
      qc.invalidateQueries({ queryKey: ["broker_assignments"] });
      toast({ title: "Usuario eliminado", description: user.full_name });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

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
        // If removing 'paciente' role, also clear broker assignment
        if (role === "paciente") {
          await supabase.from("broker_patients").delete().eq("patient_id", user.user_id);
          setAssignedBroker("__none__");
          qc.invalidateQueries({ queryKey: ["broker_assignments"] });
        }
      }
      qc.invalidateQueries({ queryKey: ["users_with_roles"] });
      toast({ title: "Rol actualizado", description: `${ROLE_LABEL[role]} ${checked ? "asignado" : "removido"}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "No se pudo actualizar", variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const isPatient = localRoles.includes("paciente");

  const handleBrokerChange = async (val: string) => {
    const newBrokerId = val === "__none__" ? null : val;
    setSavingBroker(true);
    try {
      // Always remove existing assignment first (one broker per patient)
      const { error: delErr } = await supabase
        .from("broker_patients")
        .delete()
        .eq("patient_id", user.user_id);
      if (delErr) throw delErr;

      if (newBrokerId) {
        const { error: insErr } = await supabase
          .from("broker_patients")
          .insert({ broker_id: newBrokerId, patient_id: user.user_id });
        if (insErr) throw insErr;
      }
      setAssignedBroker(val);
      qc.invalidateQueries({ queryKey: ["broker_assignments"] });
      toast({
        title: "Broker actualizado",
        description: newBrokerId ? "Asignación guardada" : "Asignación eliminada",
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message ?? "No se pudo guardar la asignación",
        variant: "destructive",
      });
    } finally {
      setSavingBroker(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{user.full_name || "(sin nombre)"}</TableCell>
      <TableCell className="bg-muted/30">
        {isPatient ? (
          <div className="flex items-center gap-2">
            <Select value={assignedBroker} onValueChange={handleBrokerChange} disabled={savingBroker}>
              <SelectTrigger className="h-8 text-xs min-w-[160px]">
                <SelectValue placeholder="Sin broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin broker</SelectItem>
                {brokers
                  .filter((b) => b.user_id !== user.user_id)
                  .map((b) => (
                    <SelectItem key={b.user_id} value={b.user_id}>
                      {b.full_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {assignedBroker !== "__none__" && (
              <Badge variant="secondary" className="gap-1 bg-success/15 text-success border-success/20">
                <CheckCircle2 className="h-3 w-3" />
                Asignado
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Solo pacientes</span>
        )}
      </TableCell>
      {ALL_ROLES.map((role) => (
        <TableCell key={role} className="text-center w-20">
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
      <TableCell className="text-muted-foreground text-xs">{user.email || "—"}</TableCell>
      <TableCell className="text-right w-12">
        {!isSelf && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={deleting}
                aria-label={`Eliminar ${user.full_name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará permanentemente a <strong>{user.full_name}</strong>
                  {user.email ? ` (${user.email})` : ""} y todos sus datos asociados.
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </TableCell>
    </TableRow>
  );
}
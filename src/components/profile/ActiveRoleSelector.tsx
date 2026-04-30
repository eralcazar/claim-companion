import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UserCheck } from "lucide-react";
import type { AppRoleLite } from "@/lib/features";

const ROLE_LABEL: Record<AppRoleLite, string> = {
  admin: "Admin",
  broker: "Broker",
  paciente: "Paciente",
  medico: "Médico",
  enfermero: "Enfermero",
  laboratorio: "Laboratorio",
  farmacia: "Farmacia",
};

// Roles clínicos que pueden coexistir con "paciente"
const CLINICAL_ROLES: AppRoleLite[] = ["medico", "enfermero", "laboratorio", "farmacia"];

export function ActiveRoleSelector() {
  const { user, roles } = useAuth();
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile_active_role", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("active_role")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const [selected, setSelected] = useState<AppRoleLite | null>(null);
  useEffect(() => {
    if (profile?.active_role) setSelected(profile.active_role as AppRoleLite);
  }, [profile]);

  // Filtramos admin (no se puede "elegir" como rol activo desde aquí)
  const myRoles = roles.filter((r) => r !== "admin") as AppRoleLite[];

  if (myRoles.length <= 1) return null;

  const isAllowedCombination = (target: AppRoleLite): string | null => {
    // Reglas:
    // - "broker" es exclusivo (no puede coexistir con clínicos ni paciente como activos a la vez)
    // - "paciente" puede ser elegido siempre que sea uno de tus roles
    // - Roles clínicos pueden coexistir con "paciente"
    if (target === "broker" && myRoles.some((r) => CLINICAL_ROLES.includes(r))) {
      return "Broker es un rol exclusivo, no puede combinarse con roles clínicos.";
    }
    return null;
  };

  const handleSelect = async (role: AppRoleLite) => {
    const err = isAllowedCombination(role);
    if (err) {
      toast.error(err);
      return;
    }
    setPending(true);
    try {
      const { error } = await supabase.rpc("set_active_role", {
        _user_id: user!.id,
        _role: role,
      });
      if (error) throw error;
      setSelected(role);
      qc.invalidateQueries({ queryKey: ["profile_active_role"] });
      toast.success(`Perfil activo: ${ROLE_LABEL[role]}`);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo cambiar el perfil");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          Perfil activo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tienes varios perfiles. Elige cuál usar. Solo uno a la vez —
          excepto que puedes combinar <strong>Médico/Enfermero/Lab/Farmacia</strong> con <strong>Paciente</strong>.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {myRoles.map((r) => {
            const isActive = selected === r;
            return (
              <Button
                key={r}
                type="button"
                variant={isActive ? "default" : "outline"}
                className="justify-start"
                disabled={pending}
                onClick={() => handleSelect(r)}
              >
                {pending && isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                {ROLE_LABEL[r]}
                {isActive && <Badge className="ml-auto" variant="secondary">Activo</Badge>}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
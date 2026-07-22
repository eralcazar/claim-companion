import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { HomeVisitsPanel } from "@/components/domicilio/HomeVisitsPanel";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Domicilio() {
  const { user, roles } = useAuth();
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [mode, setMode] = useState<"paciente" | "medico" | null>(null);

  const isPatient = roles.includes("paciente" as any);
  const isPro = roles.includes("medico" as any) || roles.includes("admin" as any);
  const canToggle = isPatient && isPro;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("active_role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const ar = (data?.active_role as string | null) ?? null;
        setActiveRole(ar);
        // Default: respect active_role for multi-role users
        if (ar === "paciente" && isPatient) setMode("paciente");
        else if (isPro) setMode("medico");
        else setMode("paciente");
      });
  }, [user, isPatient, isPro]);

  if (!user || !mode) return null;

  return (
    <div className="container py-6 max-w-4xl space-y-4">
      {canToggle && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as "paciente" | "medico")}>
          <TabsList>
            <TabsTrigger value="paciente">Mis solicitudes</TabsTrigger>
            <TabsTrigger value="medico">Bandeja profesional</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      <HomeVisitsPanel mode={mode} userId={user.id} />
    </div>
  );
}
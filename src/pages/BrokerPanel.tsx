import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCog, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNavigate, Link } from "react-router-dom";

export default function BrokerPanel() {
  const { user } = useAuth();
  const { setActingAs } = useImpersonation();
  const navigate = useNavigate();

  const { data: patients, isLoading } = useQuery({
    queryKey: ["broker-patients", user?.id],
    queryFn: async () => {
      const { data: assignments, error: aErr } = await supabase
        .from("broker_patients")
        .select("patient_id")
        .eq("broker_id", user!.id);
      if (aErr) throw aErr;
      const ids = (assignments ?? []).map((a) => a.patient_id);
      if (ids.length === 0) return [];
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, first_name, paternal_surname, email, phone")
        .in("user_id", ids);
      if (pErr) throw pErr;
      const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      return ids.map((id) => ({ patient_id: id, profile: byId.get(id) ?? null }));
    },
    enabled: !!user,
  });

  const handleActAs = (patientId: string, name: string) => {
    setActingAs(patientId, name || "Paciente");
    navigate("/");
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" />
        Panel Broker
      </h1>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : patients?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <p className="text-muted-foreground">Aún no tienes pacientes asignados</p>
            <p className="text-xs text-muted-foreground">
              Contacta al administrador para que te asigne pacientes desde el panel de usuarios.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {patients?.map((p: any) => {
            const composedName =
              p.profile?.full_name?.trim() ||
              [p.profile?.first_name, p.profile?.paternal_surname].filter(Boolean).join(" ").trim() ||
              "Sin nombre";
            return (
              <Card key={p.patient_id}>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-medium">{composedName}</p>
                    {p.profile?.email && (
                      <p className="text-sm text-muted-foreground">{p.profile.email}</p>
                    )}
                    {p.profile?.phone && (
                      <p className="text-sm text-muted-foreground">{p.profile.phone}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleActAs(p.patient_id, composedName)}
                  >
                    <UserCog className="h-4 w-4 mr-2" />
                    Ver / actuar como
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="w-full">
                    <Link to={`/personal/paciente/${p.patient_id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalle
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

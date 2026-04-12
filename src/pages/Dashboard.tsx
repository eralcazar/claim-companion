import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Pill, FileText, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: upcomingAppointments } = useQuery({
    queryKey: ["upcoming-appointments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user!.id)
        .gte("appointment_date", new Date().toISOString())
        .order("appointment_date", { ascending: true })
        .limit(3);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: activeMeds } = useQuery({
    queryKey: ["active-meds", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", user!.id)
        .eq("active", true)
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: recentClaims } = useQuery({
    queryKey: ["recent-claims", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("claims")
        .select("*, insurance_policies(company, policy_number)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    enabled: !!user,
  });

  const statusColors: Record<string, string> = {
    pendiente: "bg-warning/10 text-warning",
    aprobado: "bg-success/10 text-success",
    rechazado: "bg-destructive/10 text-destructive",
    en_revision: "bg-primary/10 text-primary",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading text-2xl font-bold">
          Hola, {profile?.full_name || "Paciente"} 👋
        </h1>
        <p className="text-muted-foreground text-sm">Tu resumen de salud</p>
      </div>

      {/* Quick action */}
      <Button
        className="w-full h-12 text-base font-semibold"
        onClick={() => navigate("/reclamos/nuevo")}
      >
        <FileText className="mr-2 h-5 w-5" />
        Nuevo Reclamo
      </Button>

      {/* Upcoming appointments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading">
            <Calendar className="h-5 w-5 text-primary" />
            Próximas Citas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppointments?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin citas programadas</p>
          ) : (
            <div className="space-y-2">
              {upcomingAppointments?.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{apt.appointment_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.appointment_date), "PPP 'a las' p", { locale: es })}
                    </p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active medications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading">
            <Pill className="h-5 w-5 text-primary" />
            Medicamentos Activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeMeds?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin medicamentos activos</p>
          ) : (
            <div className="space-y-2">
              {activeMeds?.map((med) => (
                <div key={med.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{med.name}</p>
                    <p className="text-xs text-muted-foreground">{med.dosage} — {med.frequency.replace(/_/g, " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent claims */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-heading">
            <FileText className="h-5 w-5 text-primary" />
            Reclamos Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentClaims?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin reclamos</p>
          ) : (
            <div className="space-y-2">
              {recentClaims?.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-medium">{claim.diagnosis}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(claim.created_at), "PP", { locale: es })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[claim.status] || ""}`}>
                    {claim.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

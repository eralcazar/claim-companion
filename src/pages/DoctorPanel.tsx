import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DoctorPanel() {
  const { user } = useAuth();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["doctor-appointments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*, profiles!appointments_user_id_fkey(full_name)")
        .eq("doctor_id", user!.id)
        .gte("appointment_date", new Date().toISOString())
        .order("appointment_date", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Stethoscope className="h-6 w-6 text-primary" />
        Panel Médico
      </h1>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : appointments?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sin citas asignadas</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {appointments?.map((apt: any) => (
            <Card key={apt.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{apt.profiles?.full_name || "Paciente"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{apt.appointment_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(apt.appointment_date), "PPP 'a las' p", { locale: es })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

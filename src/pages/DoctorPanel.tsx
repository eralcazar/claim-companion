import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";

export default function DoctorPanel() {
  const { user } = useAuth();
  const [detail, setDetail] = useState<{ apt: any; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-appointments", user?.id],
    queryFn: async () => {
      const { data: appts } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", user!.id)
        .gte("appointment_date", new Date().toISOString())
        .order("appointment_date", { ascending: true });
      const list = appts ?? [];
      const ids = Array.from(new Set(list.map((a: any) => a.user_id)));
      let nameMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, first_name, paternal_surname, email")
          .in("user_id", ids);
        for (const p of profiles ?? []) {
          nameMap[p.user_id] =
            (p.full_name || "").trim() ||
            [p.first_name, p.paternal_surname].filter(Boolean).join(" ") ||
            p.email ||
            "Paciente";
        }
      }
      return list.map((a: any) => ({ ...a, _patientName: nameMap[a.user_id] ?? "Paciente" }));
    },
    enabled: !!user,
  });

  const appointments = data;

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
            <Card key={apt.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setDetail({ apt, name: apt._patientName })}>
              <CardContent className="p-4 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{apt._patientName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{apt.appointment_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(apt.appointment_date), "PPP 'a las' p", { locale: es })}
                  </p>
                  {apt.address && (
                    <p className="text-xs text-muted-foreground truncate max-w-[220px]">{apt.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AppointmentDetailDialog
        appointment={detail?.apt ?? null}
        patientName={detail?.name}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
      />
    </div>
  );
}

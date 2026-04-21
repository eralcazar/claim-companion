import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, Calendar, CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterMode = "upcoming" | "today" | "week" | "month" | "range";

export default function DoctorPanel() {
  const { user } = useAuth();
  const [detail, setDetail] = useState<{ apt: any; name: string } | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("upcoming");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const computeRange = (): { from?: Date; to?: Date; futureOnly?: boolean } => {
    const now = new Date();
    switch (filterMode) {
      case "today": return { from: startOfDay(now), to: endOfDay(now) };
      case "week": return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case "month": return { from: startOfDay(subMonths(now, 1)), to: endOfDay(now) };
      case "range": return {
        from: fromDate ? startOfDay(fromDate) : undefined,
        to: toDate ? endOfDay(toDate) : undefined,
      };
      case "upcoming":
      default: return { futureOnly: true };
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-appointments", user?.id, filterMode, fromDate?.toISOString(), toDate?.toISOString()],
    queryFn: async () => {
      const { from, to, futureOnly } = computeRange();
      let q = supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", user!.id);
      if (futureOnly) {
        q = q.gte("appointment_date", new Date().toISOString()).order("appointment_date", { ascending: true });
      } else {
        if (from) q = q.gte("appointment_date", from.toISOString());
        if (to) q = q.lte("appointment_date", to.toISOString());
        q = q.order("appointment_date", { ascending: false });
      }
      const { data: appts } = await q;
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

      <div className="space-y-3">
        <ToggleGroup
          type="single"
          value={filterMode}
          onValueChange={(v) => v && setFilterMode(v as FilterMode)}
          className="flex flex-wrap justify-start gap-1"
        >
          <ToggleGroupItem value="upcoming" size="sm">Próximas</ToggleGroupItem>
          <ToggleGroupItem value="today" size="sm">Hoy</ToggleGroupItem>
          <ToggleGroupItem value="week" size="sm">7 días</ToggleGroupItem>
          <ToggleGroupItem value="month" size="sm">1 mes</ToggleGroupItem>
          <ToggleGroupItem value="range" size="sm">Rango</ToggleGroupItem>
        </ToggleGroup>

        {filterMode === "range" && (
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start", !fromDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fromDate ? format(fromDate, "PPP", { locale: es }) : "Desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={fromDate} onSelect={setFromDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("justify-start", !toDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {toDate ? format(toDate, "PPP", { locale: es }) : "Hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={toDate} onSelect={setToDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {appointments?.length ?? 0} {(appointments?.length ?? 0) === 1 ? "cita" : "citas"}
          </p>
        )}
      </div>

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
        canEditDoctorObservations={!!user && detail?.apt?.doctor_id === user.id}
      />
    </div>
  );
}

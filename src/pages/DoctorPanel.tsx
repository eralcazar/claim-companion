import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, Calendar, CalendarIcon, Users, ChevronRight, Video, ArrowUpRight } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { AppointmentDetailDialog } from "@/components/appointments/AppointmentDetailDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAssignedPatients } from "@/hooks/usePatientPersonnel";

type FilterMode = "upcoming" | "today" | "week" | "month" | "range";

export default function DoctorPanel() {
  const { user } = useAuth();
  const [detail, setDetail] = useState<{ apt: any; name: string } | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("upcoming");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [sinReceta, setSinReceta] = useState(false);
  const [soloVideo, setSoloVideo] = useState(false);
  const [searchPatient, setSearchPatient] = useState("");

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

  // Set of appointment IDs that have a receta
  const { data: aptIdsWithReceta } = useQuery({
    queryKey: ["doctor-appts-with-receta", user?.id, (data ?? []).map((a: any) => a.id).join(",")],
    enabled: !!user && (data?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = (data ?? []).map((a: any) => a.id);
      if (ids.length === 0) return new Set<string>();
      const { data: rows } = await supabase
        .from("recetas")
        .select("appointment_id")
        .in("appointment_id", ids);
      return new Set((rows ?? []).map((r: any) => r.appointment_id).filter(Boolean));
    },
  });

  const appointments = (data ?? []).filter((apt: any) => {
    if (sinReceta && aptIdsWithReceta?.has(apt.id)) return false;
    if (soloVideo && !apt.is_telemedicine) return false;
    return true;
  });

  // Assigned patients tab
  const { data: assigned = [], isLoading: loadingPatients } = useAssignedPatients("medico");
  const filteredPatients = assigned.filter((p) =>
    !searchPatient ||
    p.patient_name?.toLowerCase().includes(searchPatient.toLowerCase()) ||
    p.patient_email?.toLowerCase().includes(searchPatient.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <Stethoscope className="h-6 w-6 text-primary" />
        Panel Médico
      </h1>

      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda"><Calendar className="h-4 w-4 mr-1" />Agenda</TabsTrigger>
          <TabsTrigger value="pacientes"><Users className="h-4 w-4 mr-1" />Mis pacientes</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="space-y-3 mt-4">
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

        <div className="flex items-center gap-2">
          <Switch id="sin-receta" checked={sinReceta} onCheckedChange={setSinReceta} />
          <Label htmlFor="sin-receta" className="text-sm cursor-pointer">Solo sin receta</Label>
          <Switch id="solo-video" checked={soloVideo} onCheckedChange={setSoloVideo} className="ml-3" />
          <Label htmlFor="solo-video" className="text-sm cursor-pointer">Solo videoconsultas</Label>
        </div>

        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {appointments?.length ?? 0} {(appointments?.length ?? 0) === 1 ? "cita" : "citas"}
          </p>
        )}

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : appointments?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sin citas asignadas</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {appointments?.map((apt: any) => (
            <Card key={apt.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setDetail({ apt, name: apt._patientName })}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{apt._patientName}</p>
                      {apt.is_telemedicine && (
                        <Badge variant="default" className="h-5 text-[10px]">
                          <Video className="h-3 w-3 mr-0.5" />Video
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">{apt.appointment_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(apt.appointment_date), "PPP 'a las' p", { locale: es })}
                    </p>
                    {apt.address && !apt.is_telemedicine && (
                      <p className="text-xs text-muted-foreground truncate max-w-[220px]">{apt.address}</p>
                    )}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                  <Link to={`/consultorio/${apt.id}`}>
                    <ArrowUpRight className="h-3 w-3 mr-1" />Consultorio
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        <TabsContent value="pacientes" className="space-y-3 mt-4">
          <Input
            placeholder="Buscar paciente..."
            value={searchPatient}
            onChange={(e) => setSearchPatient(e.target.value)}
          />
          {loadingPatients ? (
            <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : filteredPatients.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Sin pacientes asignados.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredPatients.map((p) => (
                <Link key={p.id} to={`/personal/paciente/${p.patient_id}`}>
                  <Card className="hover:bg-accent/30 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{p.patient_name}</p>
                        <p className="text-xs text-muted-foreground">{p.patient_email}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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

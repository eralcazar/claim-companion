import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { useEffectiveUserId } from "@/contexts/ImpersonationContext";

type AppointmentType = Database["public"]["Enums"]["appointment_type"];

export default function Appointments() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    appointment_date: "",
    appointment_type: "consulta" as AppointmentType,
    notes: "",
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", effectiveUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("appointment_date", { ascending: true });
      return data ?? [];
    },
    enabled: !!effectiveUserId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("appointments").insert({
        user_id: effectiveUserId!,
        appointment_date: form.appointment_date,
        appointment_type: form.appointment_type,
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Cita creada");
      setOpen(false);
      setForm({ appointment_date: "", appointment_type: "consulta", notes: "" });
    },
    onError: () => toast.error("Error al crear cita"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Cita eliminada");
    },
  });

  const typeLabels: Record<string, string> = {
    consulta: "Consulta",
    estudio: "Estudio",
    procedimiento: "Procedimiento",
  };

  const now = new Date();
  const upcoming = appointments?.filter((a) => new Date(a.appointment_date) >= now) ?? [];
  const past = appointments?.filter((a) => new Date(a.appointment_date) < now) ?? [];

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Agenda</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Cita</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fecha y hora</Label>
                <Input type="datetime-local" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.appointment_type} onValueChange={(v) => setForm({ ...form, appointment_type: v as AppointmentType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulta">Consulta</SelectItem>
                    <SelectItem value="estudio">Estudio</SelectItem>
                    <SelectItem value="procedimiento">Procedimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas opcionales..." />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.appointment_date}>
                {createMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : (
        <>
          <div>
            <h2 className="font-heading text-lg font-semibold mb-3">Próximas</h2>
            {upcoming.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">Sin citas próximas</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {upcoming.map((apt) => (
                  <Card key={apt.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{typeLabels[apt.appointment_type]}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(apt.appointment_date), "PPP 'a las' p", { locale: es })}
                          </p>
                          {apt.notes && <p className="text-xs text-muted-foreground mt-1">{apt.notes}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(apt.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 className="font-heading text-lg font-semibold mb-3 text-muted-foreground">Pasadas</h2>
              <div className="space-y-3 opacity-60">
                {past.map((apt) => (
                  <Card key={apt.id}>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium">{typeLabels[apt.appointment_type]}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(apt.appointment_date), "PPP 'a las' p", { locale: es })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

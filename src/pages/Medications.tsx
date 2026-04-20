import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Pill } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useEffectiveUserId } from "@/contexts/ImpersonationContext";

type MedFrequency = Database["public"]["Enums"]["medication_frequency"];

const freqLabels: Record<string, string> = {
  diario: "Diario",
  cada_8_horas: "Cada 8 horas",
  cada_12_horas: "Cada 12 horas",
  cada_24_horas: "Cada 24 horas",
  semanal: "Semanal",
};

export default function Medications() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "diario" as MedFrequency,
    start_date: "",
    end_date: "",
  });

  const { data: medications, isLoading } = useQuery({
    queryKey: ["medications", effectiveUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .order("active", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!effectiveUserId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("medications").insert({
        user_id: effectiveUserId!,
        ...form,
        end_date: form.end_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
      toast.success("Medicamento agregado");
      setOpen(false);
      setForm({ name: "", dosage: "", frequency: "diario", start_date: "", end_date: "" });
    },
    onError: () => toast.error("Error al agregar"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("medications").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medications"] });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Medicamentos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Medicamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Ibuprofeno" />
              </div>
              <div className="space-y-2">
                <Label>Dosis</Label>
                <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="Ej: 400mg" />
              </div>
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as MedFrequency })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(freqLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin (opcional)</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name || !form.dosage || !form.start_date}>
                {createMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : medications?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sin medicamentos registrados</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {medications?.map((med) => (
            <Card key={med.id} className={!med.active ? "opacity-50" : ""}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Pill className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{med.name}</p>
                    <p className="text-xs text-muted-foreground">{med.dosage} — {freqLabels[med.frequency]}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMutation.mutate({ id: med.id, active: med.active })}
                >
                  <Badge variant={med.active ? "default" : "secondary"}>
                    {med.active ? "Activo" : "Inactivo"}
                  </Badge>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

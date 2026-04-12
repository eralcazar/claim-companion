import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Shield, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type PolicyStatus = Database["public"]["Enums"]["policy_status"];

const EMPTY_FORM = {
  company: "MetLife",
  policy_number: "",
  start_date: "",
  end_date: "",
  status: "activa" as PolicyStatus,
  suma_asegurada: "",
  observaciones: "",
};

const ASEGURADORAS = ["MetLife", "MAPFRE"];

export default function Policies() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: policies, isLoading } = useQuery({
    queryKey: ["policies", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        company: form.company,
        policy_number: form.policy_number,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
        suma_asegurada: form.suma_asegurada ? parseFloat(form.suma_asegurada) : 0,
        observaciones: form.observaciones || "",
      };
      if (editingId) {
        const { error } = await supabase.from("insurance_policies").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("insurance_policies").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success(editingId ? "Póliza actualizada" : "Póliza agregada");
      closeDialog();
    },
    onError: () => toast.error("Error al guardar póliza"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("insurance_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Póliza eliminada");
    },
    onError: () => toast.error("Error al eliminar póliza"),
  });

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      company: p.company,
      policy_number: p.policy_number,
      start_date: p.start_date,
      end_date: p.end_date || "",
      status: p.status,
      suma_asegurada: p.suma_asegurada?.toString() || "",
      observaciones: p.observaciones || "",
    });
    setOpen(true);
  };

  const policyFormContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Aseguradora</Label>
        <Select value={form.company} onValueChange={(v) => setForm({ ...form, company: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASEGURADORAS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Número de póliza</Label>
        <Input value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Fecha y hora de inicio</Label>
        <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Fecha y hora final (opcional)</Label>
        <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Suma asegurada ($)</Label>
        <Input type="number" value={form.suma_asegurada} onChange={(e) => setForm({ ...form, suma_asegurada: e.target.value })} placeholder="0.00" />
      </div>
      <div className="space-y-2">
        <Label>Estado</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PolicyStatus })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="activa">Activa</SelectItem>
            <SelectItem value="inactiva">Inactiva</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Observaciones</Label>
        <Textarea
          value={form.observaciones}
          onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          placeholder="Notas adicionales sobre la póliza..."
          rows={4}
        />
      </div>
      <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.policy_number || !form.start_date}>
        {saveMutation.isPending ? "Guardando..." : editingId ? "Actualizar" : "Guardar"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Mis Pólizas</h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nueva</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar Póliza" : "Nueva Póliza"}</DialogTitle></DialogHeader>
            <PolicyForm />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : policies?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No tienes pólizas registradas</CardContent></Card>
      ) : (
        policies?.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {p.company}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "activa" ? "default" : "secondary"}>
                    {p.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar póliza?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(p.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm text-muted-foreground">Póliza: {p.policy_number}</p>
              {(p as any).suma_asegurada > 0 && (
                <p className="text-sm font-medium">Suma asegurada: ${Number((p as any).suma_asegurada).toLocaleString()}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Desde {format(new Date(p.start_date), "PPp", { locale: es })}
                {p.end_date && ` hasta ${format(new Date(p.end_date), "PPp", { locale: es })}`}
              </p>
              {(p as any).observaciones && (
                <p className="text-xs text-muted-foreground mt-1 italic">{(p as any).observaciones}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

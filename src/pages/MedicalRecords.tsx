import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, FolderOpen, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type RecordType = Database["public"]["Enums"]["medical_record_type"];

const typeLabels: Record<string, string> = {
  receta: "Receta",
  laboratorio: "Laboratorio",
  documento: "Documento",
};

export default function MedicalRecords() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    record_type: "documento" as RecordType,
    description: "",
    record_date: new Date().toISOString().split("T")[0],
  });
  const [file, setFile] = useState<File | null>(null);

  const { data: records, isLoading } = useQuery({
    queryKey: ["medical-records", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("medical_records")
        .select("*")
        .eq("user_id", user!.id)
        .order("record_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecciona un archivo");
      const filePath = `${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("medical_records").insert({
        user_id: user!.id,
        record_type: form.record_type,
        file_path: filePath,
        description: form.description,
        record_date: form.record_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      toast.success("Registro subido");
      setOpen(false);
      setForm({ record_type: "documento", description: "", record_date: new Date().toISOString().split("T")[0] });
      setFile(null);
    },
    onError: (e) => toast.error(e.message || "Error al subir"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (record: { id: string; file_path: string }) => {
      await supabase.storage.from("documents").remove([record.file_path]);
      const { error } = await supabase.from("medical_records").delete().eq("id", record.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      toast.success("Registro eliminado");
    },
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Registros Médicos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Subir</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Subir Registro</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.record_type} onValueChange={(v) => setForm({ ...form, record_type: v as RecordType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receta">Receta</SelectItem>
                    <SelectItem value="laboratorio">Laboratorio</SelectItem>
                    <SelectItem value="documento">Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción breve" />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={form.record_date} onChange={(e) => setForm({ ...form, record_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Archivo</Label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <Button className="w-full" onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || !file}>
                {uploadMutation.isPending ? "Subiendo..." : "Subir"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : records?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Sin registros médicos</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {records?.map((rec) => (
            <Card key={rec.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{rec.description || "Sin descripción"}</p>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{typeLabels[rec.record_type]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(rec.record_date), "PP", { locale: es })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate({ id: rec.id, file_path: rec.file_path })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

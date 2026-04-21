import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, FileText, Image as ImageIcon, FileCode, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "receta", label: "Receta" },
  { value: "estudio", label: "Estudio" },
  { value: "notas_medicas", label: "Notas médicas" },
  { value: "cfdi", label: "CFDI" },
  { value: "impresion_cfdi", label: "Impresión CFDI" },
  { value: "otro", label: "Otro" },
] as const;

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = ".pdf,image/*,.xml,application/xml,text/xml";

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
  if (mime.includes("xml")) return <FileCode className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

interface Props {
  appointmentId: string;
}

export function AppointmentDocuments({ appointmentId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("receta");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; path: string } | null>(null);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["appointment-docs", appointmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointment_documents")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleUpload = async () => {
    if (!file || !user) return;
    if (file.size > MAX_BYTES) {
      toast.error("Archivo mayor a 20 MB");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${appointmentId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("appointment-docs")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("appointment_documents").insert({
        appointment_id: appointmentId,
        uploaded_by: user.id,
        file_path: path,
        file_name: file.name,
        file_type: file.type || "application/octet-stream",
        document_category: category as any,
      });
      if (dbErr) throw dbErr;
      toast.success("Documento subido");
      setFile(null);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["appointment-docs", appointmentId] });
    } catch (e: any) {
      toast.error(e.message ?? "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const deleteMut = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from("appointment-docs").remove([path]);
      const { error } = await supabase.from("appointment_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento eliminado");
      qc.invalidateQueries({ queryKey: ["appointment-docs", appointmentId] });
      setToDelete(null);
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("appointment-docs").createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("No se pudo abrir");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Documentos</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Subir
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de documento *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Archivo (PDF, imagen o XML, máx. 20 MB)</Label>
                <Input type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button className="w-full" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? "Subiendo..." : "Subir"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : !docs || docs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin documentos</p>
      ) : (
        <div className="space-y-2">
          {docs.map((d: any) => (
            <div key={d.id} className="flex items-center gap-2 p-2 border rounded-md">
              <div className="text-muted-foreground">{iconFor(d.file_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{d.file_name}</p>
                <Badge variant="secondary" className="text-[10px] mt-0.5">
                  {CATEGORIES.find((c) => c.value === d.document_category)?.label ?? d.document_category}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => download(d.file_path)}>
                <Download className="h-4 w-4" />
              </Button>
              {(d.uploaded_by === user?.id) && (
                <Button variant="ghost" size="icon" onClick={() => setToDelete({ id: d.id, path: d.file_path })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && deleteMut.mutate(toDelete)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlaskConical, FileText, Upload, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DeviceTestRequest,
  DeviceTestRequestStatus,
  STATUS_LABEL,
  STATUS_TONE,
  getEvidenceSignedUrl,
  uploadEvidence,
  useAllDeviceTestRequests,
  useUpdateDeviceTestRequest,
} from "@/hooks/useDeviceTestRequests";

const STATUS_OPTIONS: (DeviceTestRequestStatus | "all")[] = [
  "all",
  "pending",
  "in_review",
  "verified",
  "rejected",
];

function RowEditor({ req }: { req: DeviceTestRequest }) {
  const [status, setStatus] = useState<DeviceTestRequestStatus>(req.status);
  const [note, setNote] = useState(req.resolution_note ?? "");
  const [uploading, setUploading] = useState(false);
  const update = useUpdateDeviceTestRequest();

  const save = async () => {
    try {
      await update.mutateAsync({ id: req.id, status, resolution_note: note });
      toast.success("Solicitud actualizada");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al actualizar");
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("El archivo excede 15 MB");
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sesión requerida");
      const path = await uploadEvidence(req.id, auth.user.id, file);
      await update.mutateAsync({ id: req.id, evidence_path: path });
      toast.success("Evidencia cargada");
    } catch (err: any) {
      toast.error(err?.message ?? "No fue posible subir la evidencia");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const openEvidence = async () => {
    if (!req.evidence_path) return;
    try {
      const url = await getEvidenceSignedUrl(req.evidence_path);
      window.open(url, "_blank", "noopener");
    } catch (err: any) {
      toast.error(err?.message ?? "No fue posible abrir");
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{req.device_name}</p>
            <p className="text-xs text-muted-foreground">
              ID: {req.device_id} · {new Date(req.created_at).toLocaleString()}
            </p>
          </div>
          <Badge variant="outline" className={STATUS_TONE[req.status]}>
            {STATUS_LABEL[req.status]}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div><span className="text-muted-foreground">Región:</span> {req.region ?? "—"}</div>
          <div><span className="text-muted-foreground">Firmware:</span> {req.firmware ?? "—"}</div>
          <div><span className="text-muted-foreground">App:</span> {req.app_version ?? "—"}</div>
          <div className="truncate"><span className="text-muted-foreground">User:</span> {req.user_id.slice(0, 8)}</div>
        </div>

        {req.note && (
          <p className="text-sm bg-muted/40 rounded-md p-2">{req.note}</p>
        )}

        <div className="grid md:grid-cols-2 gap-3 pt-2 border-t">
          <div>
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DeviceTestRequestStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_review">En revisión</SelectItem>
                <SelectItem value="verified">Verificada</SelectItem>
                <SelectItem value="rejected">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nota de resolución</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={save} disabled={update.isPending}>Guardar</Button>
          <Label htmlFor={`file-${req.id}`} className="cursor-pointer">
            <div className="inline-flex items-center gap-1 text-sm h-9 px-3 rounded-md border bg-background hover:bg-accent">
              <Upload className="h-4 w-4" />
              {uploading ? "Subiendo…" : "Subir evidencia"}
            </div>
            <Input id={`file-${req.id}`} type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFile} />
          </Label>
          {req.evidence_path && (
            <Button size="sm" variant="ghost" className="gap-1" onClick={openEvidence}>
              <FileText className="h-4 w-4" /> Ver evidencia
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DeviceTestRequestsPage() {
  const [status, setStatus] = useState<DeviceTestRequestStatus | "all">("all");
  const [q, setQ] = useState("");
  const { data, isLoading, refetch, isFetching } = useAllDeviceTestRequests(status);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((r) =>
      [r.device_name, r.device_id, r.region, r.firmware, r.note]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle)),
    );
  }, [data, q]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" /> Solicitudes de prueba de dispositivos
          </h1>
          <p className="text-sm text-muted-foreground">
            Revisa las peticiones de usuarios, marca el resultado y publica la evidencia.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <div className="w-full md:w-52">
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "Todos" : STATUS_LABEL[s as DeviceTestRequestStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input placeholder="Buscar por modelo, región…" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sin solicitudes con los filtros actuales.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => <RowEditor key={r.id} req={r} />)}
        </div>
      )}
    </div>
  );
}
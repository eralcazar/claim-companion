import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, AlertCircle, XCircle, ClipboardCheck, Trash2 } from "lucide-react";
import {
  useMyDeviceVerifications,
  useDeleteDeviceVerification,
  type DeviceVerificationStatus,
} from "@/hooks/useDeviceVerifications";
import { COMPATIBLE_DEVICES } from "@/lib/ble/compatibleDevices";
import { toast } from "sonner";

const STATUS_LABEL: Record<DeviceVerificationStatus, string> = {
  success: "Exitosa",
  partial: "Parcial",
  failed: "Falló",
};

const STATUS_TONE: Record<DeviceVerificationStatus, string> = {
  success: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  partial: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  failed: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

function StatusIcon({ s }: { s: DeviceVerificationStatus }) {
  if (s === "success") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (s === "partial") return <AlertCircle className="h-3.5 w-3.5" />;
  return <XCircle className="h-3.5 w-3.5" />;
}

export function MyVerificationsSection() {
  const { data: rows = [], isLoading } = useMyDeviceVerifications();
  const del = useDeleteDeviceVerification();
  const [q, setQ] = useState("");
  const [device, setDevice] = useState<string>("all");
  const [status, setStatus] = useState<DeviceVerificationStatus | "all">("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const deviceNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of COMPATIBLE_DEVICES) m.set(d.id, `${d.brand} · ${d.name}`);
    return m;
  }, []);

  const usedDeviceIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.device_id))),
    [rows],
  );

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return rows.filter((r) => {
      const label = deviceNameById.get(r.device_id) ?? r.device_id;
      if (norm && !label.toLowerCase().includes(norm) && !(r.notes ?? "").toLowerCase().includes(norm)) return false;
      if (device !== "all" && r.device_id !== device) return false;
      if (status !== "all" && r.status !== status) return false;
      if (fromDate && new Date(r.tested_at) < new Date(fromDate)) return false;
      if (toDate && new Date(r.tested_at) > new Date(toDate + "T23:59:59")) return false;
      return true;
    });
  }, [rows, q, device, status, fromDate, toDate, deviceNameById]);

  const reset = () => {
    setQ(""); setDevice("all"); setStatus("all"); setFromDate(""); setToDate("");
  };

  const handleDelete = async (id: string, deviceId: string) => {
    try {
      await del.mutateAsync({ id, device_id: deviceId });
      toast.success("Verificación eliminada");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Mis verificaciones guardadas
          <Badge variant="secondary">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-4">
          <Input
            placeholder="Buscar por modelo o nota…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={device} onValueChange={setDevice}>
            <SelectTrigger><SelectValue placeholder="Modelo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los modelos</SelectItem>
              {usedDeviceIds.map((id) => (
                <SelectItem key={id} value={id}>
                  {deviceNameById.get(id) ?? id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Exitosa</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="failed">Falló</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 md:col-span-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="Desde"
            />
            <span className="text-xs text-muted-foreground">a</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="Hasta"
            />
          </div>
          <div className="flex items-center justify-end md:col-span-2">
            <Button size="sm" variant="ghost" onClick={reset}>
              Limpiar filtros
            </Button>
          </div>
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {rows.length === 0
              ? "Todavía no has registrado ninguna verificación. Abre la ficha de un dispositivo para registrar una."
              : "Ninguna verificación coincide con los filtros."}
          </p>
        )}

        <ul className="space-y-2">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-border p-3 flex flex-wrap items-start justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="font-medium text-sm truncate">
                  {deviceNameById.get(r.device_id) ?? r.device_id}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className={`gap-1 ${STATUS_TONE[r.status]}`}>
                    <StatusIcon s={r.status} /> {STATUS_LABEL[r.status]}
                  </Badge>
                  {r.connection_method && (
                    <Badge variant="outline" className="text-[10px]">
                      {r.connection_method.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {r.firmware && (
                    <Badge variant="outline" className="text-[10px]">
                      fw {r.firmware}
                    </Badge>
                  )}
                  {r.app_version && (
                    <Badge variant="outline" className="text-[10px]">
                      app {r.app_version}
                    </Badge>
                  )}
                </div>
                {r.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {r.notes}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {new Date(r.tested_at).toLocaleString("es-MX")}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(r.id, r.device_id)}
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
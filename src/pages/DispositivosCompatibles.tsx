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
import { Bluetooth, CheckCircle2, Search, Smartphone, Apple, Ban, Zap, PlusCircle } from "lucide-react";
import {
  COMPATIBLE_DEVICES,
  CONNECTION_LABELS,
  DEVICE_TYPE_LABELS,
  READING_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  type CompatibleDevice,
  type CompatibleReading,
  type CompatibilityStatus,
  type ConnectionMethod,
  type DeviceType,
} from "@/lib/ble/compatibleDevices";
import { BleCompatibilityCheck } from "@/components/ble/BleCompatibilityCheck";
import { WearableConnectionTest } from "@/components/health/WearableConnectionTest";
import { WearableCompatibilityLookup } from "@/components/health/WearableCompatibilityLookup";
import { DeviceDetailSheet } from "@/components/ble/DeviceDetailSheet";
import { MyVerificationsSection } from "@/components/ble/MyVerificationsSection";
import { RequestDeviceIntegrationDialog } from "@/components/ble/RequestDeviceIntegrationDialog";

const TONE_CLASS: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  info: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  warning: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  danger: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

function ConnIcon({ method }: { method: ConnectionMethod }) {
  if (method === "ble_direct") return <Bluetooth className="h-3.5 w-3.5" />;
  if (method === "health_connect") return <Smartphone className="h-3.5 w-3.5" />;
  if (method === "healthkit") return <Apple className="h-3.5 w-3.5" />;
  if (method === "vendor_app_bridge") return <Zap className="h-3.5 w-3.5" />;
  return <Ban className="h-3.5 w-3.5" />;
}

export default function DispositivosCompatibles() {
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState<string>("all");
  const [type, setType] = useState<DeviceType | "all">("all");
  const [conn, setConn] = useState<ConnectionMethod | "all">("all");
  const [status, setStatus] = useState<CompatibilityStatus | "all">("all");
  const [reading, setReading] = useState<CompatibleReading | "all">("all");
  const [selected, setSelected] = useState<CompatibleDevice | null>(null);
  const [integrationOpen, setIntegrationOpen] = useState(false);

  const brands = useMemo(
    () => Array.from(new Set(COMPATIBLE_DEVICES.map((d) => d.brand))).sort(),
    []
  );

  const list = useMemo(() => {
    const norm = q.trim().toLowerCase();
    return COMPATIBLE_DEVICES.filter((d) => {
      if (norm && !`${d.name} ${d.brand}`.toLowerCase().includes(norm)) return false;
      if (brand !== "all" && d.brand !== brand) return false;
      if (type !== "all" && d.deviceType !== type) return false;
      if (conn !== "all" && d.connectionMethod !== conn) return false;
      if (status !== "all" && d.compatibilityStatus !== status) return false;
      if (reading !== "all" && !d.readings.includes(reading)) return false;
      return true;
    });
  }, [q, brand, type, conn, status, reading]);

  const resetFilters = () => {
    setQ(""); setBrand("all"); setType("all"); setConn("all"); setStatus("all"); setReading("all");
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Bluetooth className="h-6 w-6 text-primary" />
            Dispositivos y wearables compatibles
          </h1>
          <p className="text-sm text-muted-foreground">
            Busca tu modelo, revisa su método de conexión (BLE directo, Google Health Connect o Apple HealthKit)
            y consulta las instrucciones de emparejamiento paso a paso.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 shrink-0"
          onClick={() => setIntegrationOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          Solicitar integración de un modelo
        </Button>
      </header>

      <RequestDeviceIntegrationDialog open={integrationOpen} onOpenChange={setIntegrationOpen} />

      <div id="probar">
        <BleCompatibilityCheck />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Buscar dispositivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre o marca (p. ej. Xiaomi, Omron, Apple Watch)"
              className="pl-9"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger><SelectValue placeholder="Marca" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(DEVICE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={conn} onValueChange={(v) => setConn(v as any)}>
              <SelectTrigger><SelectValue placeholder="Conexión" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier conexión</SelectItem>
                {Object.entries(CONNECTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier estado</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={reading} onValueChange={(v) => setReading(v as any)}>
              <SelectTrigger><SelectValue placeholder="Medición" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier medición</SelectItem>
                {Object.entries(READING_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{list.length} resultado{list.length === 1 ? "" : "s"}</span>
            <Button size="sm" variant="ghost" onClick={resetFilters}>Limpiar filtros</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((d) => {
          const tone = TONE_CLASS[STATUS_TONE[d.compatibilityStatus]];
          return (
            <Card key={d.id} className="flex flex-col hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span className="leading-tight">{d.name}</span>
                  {d.tested && (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> Probado
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{d.brand} · {DEVICE_TYPE_LABELS[d.deviceType]}</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 text-sm">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className={tone}>
                    {STATUS_LABELS[d.compatibilityStatus]}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <ConnIcon method={d.connectionMethod} />
                    {CONNECTION_LABELS[d.connectionMethod]}
                  </Badge>
                </div>
                {d.readings.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {d.readings.map((r) => (
                      <Badge key={r} variant="outline" className="text-xs">{READING_LABELS[r]}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-muted-foreground text-xs line-clamp-3">{d.notes}</p>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-xs">
                  <span className="font-medium capitalize">
                    {d.priceTier}{d.priceUsd ? ` · ${d.priceUsd}` : ""}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(d)}>
                    Ver ficha
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {list.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay dispositivos que coincidan con tu búsqueda.
        </p>
      )}

      <DeviceDetailSheet
        device={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />

      <MyVerificationsSection />
    </div>
  );
}
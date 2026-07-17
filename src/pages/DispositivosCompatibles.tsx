import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bluetooth, CheckCircle2, ExternalLink } from "lucide-react";
import {
  COMPATIBLE_DEVICES,
  READING_LABELS,
  type CompatibleReading,
} from "@/lib/ble/compatibleDevices";
import { BleCompatibilityCheck } from "@/components/ble/BleCompatibilityCheck";

const FILTERS: { key: CompatibleReading | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "spo2", label: "SpO₂" },
  { key: "blood_pressure", label: "Presión" },
  { key: "temperature", label: "Temperatura" },
  { key: "heart_rate", label: "Frecuencia" },
];

export default function DispositivosCompatibles() {
  const [filter, setFilter] = useState<CompatibleReading | "all">("all");
  const list = COMPATIBLE_DEVICES.filter((d) => filter === "all" || d.readings.includes(filter));

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-5xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <Bluetooth className="h-6 w-6 text-primary" />
          Dispositivos BLE compatibles
        </h1>
        <p className="text-sm text-muted-foreground">
          CareCentral funciona con dispositivos que usan perfiles GATT estándar.
          Aquí encuentras opciones probadas y recomendadas por tipo de medición y rango de precio.
        </p>
      </header>

      <BleCompatibilityCheck />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((d) => (
          <Card key={d.id}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2">
                <span>{d.name}</span>
                {d.tested && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Probado
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{d.brand}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-1">
                {d.readings.map((r) => (
                  <Badge key={r} variant="outline">{READING_LABELS[r]}</Badge>
                ))}
              </div>
              <p className="text-muted-foreground">{d.notes}</p>
              <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                <span className="text-muted-foreground">{d.gattService}</span>
                <span className="font-medium capitalize">
                  {d.priceTier}{d.priceUsd ? ` · ${d.priceUsd}` : ""}
                </span>
              </div>
              {d.url && (
                <Button asChild size="sm" variant="ghost" className="gap-1 h-8 px-2">
                  <a href={d.url} target="_blank" rel="noreferrer">
                    Más info <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay dispositivos para este filtro.
        </p>
      )}
    </div>
  );
}
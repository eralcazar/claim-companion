import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Apple, Bluetooth, CheckCircle2, HelpCircle, Search, Smartphone, XCircle } from "lucide-react";
import {
  COMPATIBLE_DEVICES,
  CONNECTION_LABELS,
  READING_LABELS,
  STATUS_LABELS,
  type CompatibleDevice,
} from "@/lib/ble/compatibleDevices";

/** Búsqueda rápida marca+modelo → dice si funciona con Health Connect / Apple Health. */
export function WearableCompatibilityLookup() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<CompatibleDevice | null>(null);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return COMPATIBLE_DEVICES.filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.brand.toLowerCase().includes(s)
    ).slice(0, 8);
  }, [q]);

  const answer = (d: CompatibleDevice) => {
    const isHC = d.connectionMethod === "health_connect";
    const isHK = d.connectionMethod === "healthkit";
    const isBridge = d.connectionMethod === "vendor_app_bridge";
    const isBle = d.connectionMethod === "ble_direct";
    const isNo = d.connectionMethod === "not_compatible";

    if (isNo) {
      return {
        variant: "destructive" as const,
        icon: XCircle,
        title: "No compatible con CareCentral",
        body: "Este modelo usa un protocolo propietario y no expone datos a Health Connect ni Apple Salud.",
      };
    }
    if (isHC || isBridge) {
      return {
        variant: "default" as const,
        icon: Smartphone,
        title: "Compatible vía Google Health Connect (Android)",
        body: isBridge
          ? "Requiere la app oficial del fabricante como puente. Configurala para escribir en Health Connect y CareCentral la leerá."
          : "Sincroniza directo desde la app del fabricante hacia Health Connect. CareCentral leerá desde ahí.",
      };
    }
    if (isHK) {
      return {
        variant: "default" as const,
        icon: Apple,
        title: "Compatible vía Apple Salud (iOS)",
        body: "Se sincroniza automáticamente con la app Salud de iPhone. CareCentral en iOS lo importará al pulsar Sincronizar ahora.",
      };
    }
    if (isBle) {
      return {
        variant: "default" as const,
        icon: Bluetooth,
        title: "Conexión Bluetooth directa",
        body: "Se conecta directo al navegador o app móvil sin app del fabricante. No pasa por Health Connect.",
      };
    }
    return {
      variant: "default" as const,
      icon: HelpCircle,
      title: "Compatibilidad no confirmada",
      body: d.notes,
    };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" /> Verificador rápido por marca y modelo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Escribí la marca y modelo de tu reloj o smartband y te decimos en el momento si funciona
          con Google Health Connect o Apple Salud.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(null);
            }}
            placeholder="Ej. Xiaomi Smart Band 10, Apple Watch, Omron M7"
            className="pl-9"
          />
        </div>

        {q.length >= 2 && matches.length === 0 && (
          <Alert>
            <HelpCircle className="h-4 w-4" />
            <AlertTitle>Modelo no está en el catálogo</AlertTitle>
            <AlertDescription className="text-xs">
              No lo tenemos catalogado todavía. Podés solicitar la integración desde el botón
              "Solicitar integración de un modelo" o realizar la Prueba paso a paso: si tu reloj
              escribe en Health Connect / Apple Salud, CareCentral podrá leerlo aunque no esté en el catálogo.
            </AlertDescription>
          </Alert>
        )}

        {matches.length > 0 && !selected && (
          <ul className="space-y-1">
            {matches.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setSelected(d)}
                  className="w-full text-left rounded-md border p-2 text-sm hover:border-primary/50 hover:bg-muted/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{d.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {STATUS_LABELS[d.compatibilityStatus]}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.brand} · {CONNECTION_LABELS[d.connectionMethod]}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selected && (() => {
          const a = answer(selected);
          const Icon = a.icon;
          const isOk = a.variant !== "destructive";
          return (
            <div className="space-y-2">
              <Alert variant={a.variant}>
                <Icon className="h-4 w-4" />
                <AlertTitle>{selected.name} — {a.title}</AlertTitle>
                <AlertDescription className="text-xs space-y-2">
                  <div>{a.body}</div>
                  {isOk && selected.readings.length > 0 && (
                    <div>
                      <div className="font-medium text-xs mb-1">Métricas soportadas:</div>
                      <div className="flex flex-wrap gap-1">
                        {selected.readings.map((r) => (
                          <Badge key={r} variant="secondary" className="text-xs gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {READING_LABELS[r]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.notes && (
                    <div className="text-xs opacity-80">Nota: {selected.notes}</div>
                  )}
                </AlertDescription>
              </Alert>
              <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setQ(""); }}>
                Buscar otro modelo
              </Button>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type ImportSettings = {
  temperatureUnit: "C" | "F";
  glucoseUnit: "mg_dl" | "mmol_l";
  weightUnit: "kg" | "lb";
  distanceUnit: "km" | "mi";
  timezone: string;
  deviceTimezoneMode: "device" | "app" | "manual";
};

const DEFAULTS: ImportSettings = {
  temperatureUnit: "C",
  glucoseUnit: "mg_dl",
  weightUnit: "kg",
  distanceUnit: "km",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Mexico_City",
  deviceTimezoneMode: "device",
};

const STORAGE_KEY = "cc.import.settings";

export function getImportSettings(userId?: string | null): ImportSettings {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}.${userId ?? "anon"}`);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const COMMON_TZ = [
  "America/Mexico_City",
  "America/Monterrey",
  "America/Tijuana",
  "America/Cancun",
  "America/Los_Angeles",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Bogota",
  "America/Buenos_Aires",
  "Europe/Madrid",
  "UTC",
];

export function ImportSettingsCard() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ImportSettings>(DEFAULTS);
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    setSettings(getImportSettings(user?.id));
  }, [user?.id]);

  const save = () => {
    localStorage.setItem(`${STORAGE_KEY}.${user?.id ?? "anon"}`, JSON.stringify(settings));
    toast.success("Ajustes de importación guardados");
  };
  const reset = () => {
    setSettings(DEFAULTS);
    localStorage.removeItem(`${STORAGE_KEY}.${user?.id ?? "anon"}`);
    toast.info("Ajustes restaurados a valores por defecto");
  };

  const set = <K extends keyof ImportSettings>(k: K, v: ImportSettings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" /> Ajustes de unidades y zona horaria
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Confirma las unidades y la zona horaria usadas al importar lecturas. Si un valor se ve raro (por ejemplo una temperatura en °F guardada como °C), ajusta aquí y vuelve a sincronizar.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Label className="text-xs">Temperatura</Label>
            <Select value={settings.temperatureUnit} onValueChange={(v) => set("temperatureUnit", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="C">°C (Celsius)</SelectItem>
                <SelectItem value="F">°F (Fahrenheit)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Glucosa</Label>
            <Select value={settings.glucoseUnit} onValueChange={(v) => set("glucoseUnit", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mg_dl">mg/dL</SelectItem>
                <SelectItem value="mmol_l">mmol/L</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Peso</Label>
            <Select value={settings.weightUnit} onValueChange={(v) => set("weightUnit", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lb">lb</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Distancia</Label>
            <Select value={settings.distanceUnit} onValueChange={(v) => set("distanceUnit", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="km">km</SelectItem>
                <SelectItem value="mi">mi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Zona horaria del dispositivo</Label>
            <Badge variant="secondary" className="text-[10px]">Detectada: {detected}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={settings.deviceTimezoneMode} onValueChange={(v) => set("deviceTimezoneMode", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="device">Usar la del dispositivo (recomendado)</SelectItem>
                <SelectItem value="app">Usar la del sistema/app</SelectItem>
                <SelectItem value="manual">Zona manual</SelectItem>
              </SelectContent>
            </Select>
            {settings.deviceTimezoneMode === "manual" ? (
              <Select value={settings.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMON_TZ.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={settings.timezone} readOnly className="bg-muted" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Si las horas de tus lecturas aparecen desfasadas, usa <b>Zona manual</b> y elige la correcta, luego <b>Sincronizar ahora</b> para reimportar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={save} className="gap-2">
            <Save className="h-4 w-4" /> Guardar
          </Button>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" /> Restaurar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
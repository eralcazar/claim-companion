import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";
import {
  READING_LABELS,
  type CompatibleReading,
} from "@/lib/ble/compatibleDevices";

type FieldSpec = {
  table: string;
  timeField: string;
  valueFields: { name: string; label: string; unit?: string }[];
  metaFields: string[];
};

const FIELD_MAP: Partial<Record<CompatibleReading, FieldSpec>> = {
  heart_rate: {
    table: "heart_rate_readings",
    timeField: "measured_at",
    valueFields: [{ name: "bpm", label: "BPM", unit: "lpm" }],
    metaFields: ["source", "device_name", "context", "notes", "external_uuid"],
  },
  spo2: {
    table: "spo2_readings",
    timeField: "taken_at",
    valueFields: [{ name: "spo2", label: "SpO₂", unit: "%" }],
    metaFields: ["source", "device_name", "external_uuid"],
  },
  blood_pressure: {
    table: "blood_pressure_readings",
    timeField: "taken_at",
    valueFields: [
      { name: "systolic", label: "Sistólica", unit: "mmHg" },
      { name: "diastolic", label: "Diastólica", unit: "mmHg" },
      { name: "pulse", label: "Pulso", unit: "lpm" },
    ],
    metaFields: ["source", "device_name", "external_uuid"],
  },
  temperature: {
    table: "temperature_readings",
    timeField: "taken_at",
    valueFields: [{ name: "temperature_c", label: "Temperatura", unit: "°C" }],
    metaFields: ["method", "source", "device_name", "external_uuid"],
  },
  activity: {
    table: "activity_readings",
    timeField: "fecha",
    valueFields: [
      { name: "steps", label: "Pasos" },
      { name: "active_minutes", label: "Min. activos" },
      { name: "calories", label: "Calorías" },
    ],
    metaFields: ["source", "device_name", "external_uuid"],
  },
  sleep: {
    table: "activity_readings",
    timeField: "fecha",
    valueFields: [{ name: "sleep_minutes", label: "Sueño", unit: "min" }],
    metaFields: ["source", "device_name", "external_uuid"],
  },
  weight: {
    table: "— (informativo)",
    timeField: "—",
    valueFields: [{ name: "weight_kg", label: "Peso", unit: "kg" }],
    metaFields: ["Actualmente no se persiste automáticamente"],
  },
};

export function DeviceFieldsMap({ readings }: { readings: CompatibleReading[] }) {
  const specs = readings
    .map((r) => ({ reading: r, spec: FIELD_MAP[r] }))
    .filter((s) => !!s.spec) as { reading: CompatibleReading; spec: FieldSpec }[];

  if (!specs.length) return null;

  return (
    <div className="rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Métricas importadas y campos guardados</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Estos son los campos exactos que CareCentral persiste en tu expediente por cada lectura de este dispositivo.
      </p>
      <ul className="space-y-3">
        {specs.map(({ reading, spec }) => (
          <li key={reading} className="rounded-md border border-border/60 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{READING_LABELS[reading]}</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {spec.table}
              </Badge>
            </div>
            <div className="mt-2 grid gap-1 text-xs">
              <div className="flex flex-wrap gap-1">
                <span className="text-muted-foreground">Fecha/hora:</span>
                <code className="text-[11px]">{spec.timeField}</code>
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-muted-foreground">Valores:</span>
                {spec.valueFields.map((f) => (
                  <Badge key={f.name} variant="secondary" className="text-[10px] font-normal">
                    {f.label} <span className="opacity-60 ml-1">{f.name}{f.unit ? ` · ${f.unit}` : ""}</span>
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-muted-foreground">Metadatos:</span>
                {spec.metaFields.map((m) => (
                  <code key={m} className="text-[10px] px-1 py-0.5 rounded bg-muted">{m}</code>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
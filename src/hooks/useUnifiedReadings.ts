import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReadingKind =
  | "heart_rate"
  | "blood_pressure"
  | "spo2"
  | "temperature"
  | "glucose"
  | "steps";

export type ReadingSource =
  | "ble"
  | "apple_health"
  | "health_connect"
  | "manual"
  | "csv"
  | "otro";

export type UnifiedReading = {
  id: string;
  kind: ReadingKind;
  measured_at: string;
  value: number;
  value2?: number | null;
  unit: string;
  source: ReadingSource;
  device_name?: string | null;
  notes?: string | null;
};

function normSource(s: string | null | undefined): ReadingSource {
  if (!s) return "otro";
  if (s === "apple_health" || s === "healthkit") return "apple_health";
  if (s === "health_connect") return "health_connect";
  if (s === "manual") return "manual";
  if (s === "csv") return "csv";
  if (s === "ble" || s.startsWith("ble") || s.startsWith("wellue") || s.startsWith("omron"))
    return "ble";
  return "otro";
}

/** Trae todas las lecturas del paciente en un rango, normalizadas por tipo. */
export function useUnifiedReadings(
  patientId: string | undefined,
  fromISO: string,
  toISO: string,
  kinds?: ReadingKind[],
) {
  return useQuery({
    queryKey: ["unified-readings", patientId, fromISO, toISO, kinds?.join(",") ?? "all"],
    enabled: !!patientId,
    queryFn: async (): Promise<UnifiedReading[]> => {
      if (!patientId) return [];
      const wants = (k: ReadingKind) => !kinds || kinds.includes(k);
      const out: UnifiedReading[] = [];

      if (wants("heart_rate")) {
        const { data } = await supabase
          .from("heart_rate_readings")
          .select("id, bpm, measured_at, source, device_name, notes")
          .eq("patient_id", patientId)
          .gte("measured_at", fromISO)
          .lte("measured_at", toISO)
          .order("measured_at", { ascending: true });
        (data ?? []).forEach((r: any) =>
          out.push({
            id: r.id,
            kind: "heart_rate",
            measured_at: r.measured_at,
            value: r.bpm,
            unit: "bpm",
            source: normSource(r.source),
            device_name: r.device_name,
            notes: r.notes,
          }),
        );
      }

      if (wants("blood_pressure")) {
        const { data } = await supabase
          .from("blood_pressure_readings")
          .select("id, systolic, diastolic, taken_at, source, device_name, notes")
          .eq("patient_id", patientId)
          .gte("taken_at", fromISO)
          .lte("taken_at", toISO)
          .order("taken_at", { ascending: true });
        (data ?? []).forEach((r: any) =>
          out.push({
            id: r.id,
            kind: "blood_pressure",
            measured_at: r.taken_at,
            value: r.systolic,
            value2: r.diastolic,
            unit: "mmHg",
            source: normSource(r.source),
            device_name: r.device_name,
            notes: r.notes,
          }),
        );
      }

      if (wants("spo2")) {
        const { data } = await supabase
          .from("spo2_readings")
          .select("id, spo2, taken_at, source, device_name, notes")
          .eq("patient_id", patientId)
          .gte("taken_at", fromISO)
          .lte("taken_at", toISO)
          .order("taken_at", { ascending: true });
        (data ?? []).forEach((r: any) =>
          out.push({
            id: r.id,
            kind: "spo2",
            measured_at: r.taken_at,
            value: r.spo2,
            unit: "%",
            source: normSource(r.source),
            device_name: r.device_name,
            notes: r.notes,
          }),
        );
      }

      if (wants("temperature")) {
        const { data } = await supabase
          .from("temperature_readings")
          .select("id, temperature_c, taken_at, source, device_name, notes")
          .eq("patient_id", patientId)
          .gte("taken_at", fromISO)
          .lte("taken_at", toISO)
          .order("taken_at", { ascending: true });
        (data ?? []).forEach((r: any) =>
          out.push({
            id: r.id,
            kind: "temperature",
            measured_at: r.taken_at,
            value: Number(r.temperature_c),
            unit: "°C",
            source: normSource(r.source),
            device_name: r.device_name,
            notes: r.notes,
          }),
        );
      }

      if (wants("glucose")) {
        const { data } = await supabase
          .from("glucose_readings")
          .select("id, glucose_mgdl, taken_at, source, device_name, notes")
          .eq("patient_id", patientId)
          .gte("taken_at", fromISO)
          .lte("taken_at", toISO)
          .order("taken_at", { ascending: true });
        (data ?? []).forEach((r: any) =>
          out.push({
            id: r.id,
            kind: "glucose",
            measured_at: r.taken_at,
            value: r.glucose_mgdl,
            unit: "mg/dL",
            source: normSource(r.source),
            device_name: r.device_name,
            notes: r.notes,
          }),
        );
      }

      if (wants("steps")) {
        const { data } = await supabase
          .from("activity_readings")
          .select("id, steps, fecha, source, device_name")
          .eq("patient_id", patientId)
          .gte("fecha", fromISO.slice(0, 10))
          .lte("fecha", toISO.slice(0, 10))
          .order("fecha", { ascending: true });
        (data ?? []).forEach((r: any) => {
          if (r.steps == null) return;
          out.push({
            id: r.id,
            kind: "steps",
            measured_at: `${r.fecha}T12:00:00Z`,
            value: r.steps,
            unit: "pasos",
            source: normSource(r.source),
            device_name: r.device_name,
          });
        });
      }

      return out.sort((a, b) => a.measured_at.localeCompare(b.measured_at));
    },
  });
}

export const KIND_LABEL: Record<ReadingKind, string> = {
  heart_rate: "Frecuencia cardíaca",
  blood_pressure: "Presión arterial",
  spo2: "SpO₂",
  temperature: "Temperatura",
  glucose: "Glucosa",
  steps: "Pasos",
};

export const SOURCE_LABEL: Record<ReadingSource, string> = {
  ble: "BLE",
  apple_health: "Apple Health",
  health_connect: "Health Connect",
  manual: "Manual",
  csv: "CSV",
  otro: "Otro",
};
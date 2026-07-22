import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { COMPATIBLE_DEVICES, type CompatibleReading } from "@/lib/ble/compatibleDevices";

/** Un “monitor” de la app y las lecturas que necesita para activarse. */
export const MONITOR_MAP = {
  heart_rate: ["heart_rate"] as CompatibleReading[],
  sleep: ["sleep"] as CompatibleReading[],
  steps: ["activity"] as CompatibleReading[],
  spo2: ["spo2"] as CompatibleReading[],
  blood_pressure: ["blood_pressure"] as CompatibleReading[],
  temperature: ["temperature"] as CompatibleReading[],
} as const;

export type MonitorKey = keyof typeof MONITOR_MAP;

export type DeviceCapabilitySummary = {
  capabilities: Set<CompatibleReading>;
  enabledMonitors: Record<MonitorKey, boolean>;
  devices: Array<{ name: string; readings: CompatibleReading[] }>;
};

function matchDevice(model?: string | null, name?: string | null) {
  const q = `${model ?? ""} ${name ?? ""}`.toLowerCase();
  if (!q.trim()) return null;
  return (
    COMPATIBLE_DEVICES.find((d) =>
      q.includes(d.id.replace(/-/g, " ")) ||
      q.includes(d.name.toLowerCase()) ||
      q.includes(d.brand.toLowerCase() + " " + d.name.split(" ")[1]?.toLowerCase()),
    ) ?? null
  );
}

/**
 * Detecta qué lecturas puede ofrecer el paciente según sus dispositivos
 * emparejados (patient_ble_pairings) y la última semana de activity_readings.
 * Habilita automáticamente monitores de pulso, sueño y pasos aunque el
 * dispositivo no mida oxigenación ni presión arterial.
 */
export function useDeviceCapabilities() {
  const { user } = useAuth();
  const { actingAsPatientId } = useImpersonation();
  const patientId = actingAsPatientId ?? user?.id;

  return useQuery({
    queryKey: ["device-capabilities", patientId],
    enabled: !!patientId,
    queryFn: async (): Promise<DeviceCapabilitySummary> => {
      const [pairsRes, actRes] = await Promise.all([
        supabase
          .from("patient_ble_pairings")
          .select("device_name, model, service_type, last_status, unpaired_at")
          .eq("patient_id", patientId!)
          .is("unpaired_at", null),
        supabase
          .from("activity_readings")
          .select("steps, sleep_minutes, active_minutes, source")
          .eq("patient_id", patientId!)
          .gte("fecha", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
      ]);

      const caps = new Set<CompatibleReading>();
      const devices: DeviceCapabilitySummary["devices"] = [];

      // 1) Capacidades declaradas por dispositivo emparejado
      for (const p of pairsRes.data ?? []) {
        const dev = matchDevice(p.model, p.device_name);
        if (dev) {
          dev.readings.forEach((r) => caps.add(r));
          devices.push({ name: dev.name, readings: dev.readings });
        } else if (p.service_type) {
          // Fallback: service_type BLE genérico
          if (p.service_type.includes("heart")) caps.add("heart_rate");
          if (p.service_type.includes("pulse") || p.service_type.includes("spo2")) caps.add("spo2");
          if (p.service_type.includes("blood")) caps.add("blood_pressure");
          devices.push({ name: p.device_name ?? p.model ?? "Dispositivo", readings: [] });
        }
      }

      // 2) Capacidades observadas por datos reales
      for (const r of actRes.data ?? []) {
        if ((r.steps ?? 0) > 0) caps.add("activity");
        if ((r.sleep_minutes ?? 0) > 0) caps.add("sleep");
        if ((r.active_minutes ?? 0) > 0) caps.add("activity");
      }

      const enabledMonitors = Object.fromEntries(
        Object.entries(MONITOR_MAP).map(([k, needs]) => [
          k,
          needs.some((n) => caps.has(n)),
        ]),
      ) as Record<MonitorKey, boolean>;

      return { capabilities: caps, enabledMonitors, devices };
    },
  });
}
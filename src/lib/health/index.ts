import { Capacitor } from "@capacitor/core";

export type HealthMetric =
  | "heart_rate"
  | "spo2"
  | "blood_pressure"
  | "glucose"
  | "temperature"
  | "steps"
  | "active_minutes"
  | "calories"
  | "sleep";

export type HealthSample = {
  metric: HealthMetric;
  value: number;
  value2?: number; // e.g. diastolic
  measured_at: string; // ISO
  device_name?: string;
  external_uuid: string;
};

export type HealthPlatform = "ios" | "android" | "web";

export function getPlatform(): HealthPlatform {
  if (!Capacitor.isNativePlatform()) return "web";
  return Capacitor.getPlatform() === "ios" ? "ios" : "android";
}

export function isHealthAvailable(): boolean {
  return getPlatform() !== "web";
}

/**
 * Lazy loader for capacitor-health. The plugin is only available in the
 * native build; on web we return a stub so imports don't blow up.
 */
async function getPlugin(): Promise<any | null> {
  if (!isHealthAvailable()) return null;
  try {
    const mod: any = await import("capacitor-health");
    return mod.CapacitorHealth ?? mod.Health ?? mod.default ?? null;
  } catch {
    return null;
  }
}

const READ_TYPES = [
  "steps",
  "active-calories",
  "heart-rate",
  "blood-pressure",
  "oxygen-saturation",
  "temperature",
  "blood-glucose",
  "sleep",
  "workouts",
];

export async function requestHealthPermissions(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    if (typeof plugin.requestHealthPermissions === "function") {
      const res = await plugin.requestHealthPermissions({ permissions: READ_TYPES });
      return !!res?.permissionsGranted ?? true;
    }
    if (typeof plugin.requestPermissions === "function") {
      await plugin.requestPermissions({ read: READ_TYPES });
      return true;
    }
  } catch (err) {
    console.warn("[health] permission request failed", err);
  }
  return false;
}

export async function checkHealthAvailability(): Promise<boolean> {
  const plugin = await getPlugin();
  if (!plugin) return false;
  try {
    if (typeof plugin.isHealthAvailable === "function") {
      const res = await plugin.isHealthAvailable();
      return !!res?.available;
    }
  } catch {}
  return isHealthAvailable();
}

/**
 * Reads samples for a given metric range. Falls back to empty arrays when
 * running on web or when the plugin API differs.
 */
export async function readSamples(
  metric: HealthMetric,
  from: Date,
  to: Date = new Date()
): Promise<HealthSample[]> {
  const plugin = await getPlugin();
  if (!plugin) return [];

  const dataTypeMap: Record<HealthMetric, string> = {
    heart_rate: "heart-rate",
    spo2: "oxygen-saturation",
    blood_pressure: "blood-pressure",
    glucose: "blood-glucose",
    temperature: "temperature",
    steps: "steps",
    active_minutes: "active-calories",
    calories: "active-calories",
    sleep: "sleep",
  };
  const dataType = dataTypeMap[metric];

  try {
    const fn = plugin.queryAggregated ?? plugin.queryHealthData ?? plugin.query;
    if (!fn) return [];
    const res = await fn.call(plugin, {
      dataType,
      startDate: from.toISOString(),
      endDate: to.toISOString(),
      bucket: "day",
    });
    const rows: any[] = res?.aggregatedData ?? res?.data ?? res?.samples ?? [];
    return rows
      .map((r: any, idx: number) => {
        const value = Number(r.value ?? r.systolic ?? r.avg ?? r.count ?? 0);
        const value2 = r.diastolic ? Number(r.diastolic) : undefined;
        const dateStr =
          r.startDate ?? r.date ?? r.timestamp ?? r.time ?? new Date().toISOString();
        return {
          metric,
          value,
          value2,
          measured_at: new Date(dateStr).toISOString(),
          device_name: r.sourceName ?? r.source ?? undefined,
          external_uuid: r.uuid ?? r.id ?? `${metric}-${dateStr}-${idx}`,
        } as HealthSample;
      })
      .filter((s) => s.value > 0);
  } catch (err) {
    console.warn("[health] read failed", metric, err);
    return [];
  }
}
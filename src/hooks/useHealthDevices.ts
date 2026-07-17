import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  checkHealthAvailability,
  getPlatform,
  readSamples,
  requestHealthPermissions,
  type HealthMetric,
  type HealthSample,
} from "@/lib/health";

type ProfileHealthRow = { health_last_synced_at: string | null };

export function useHealthDevices() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const platform = getPlatform();

  const availabilityQ = useQuery({
    queryKey: ["health-availability"],
    queryFn: () => checkHealthAvailability(),
  });

  const profileQ = useQuery({
    queryKey: ["profile-health", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("health_last_synced_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { health_last_synced_at: null }) as ProfileHealthRow;
    },
  });

  const requestPerms = useMutation({
    mutationFn: () => requestHealthPermissions(),
  });

  const syncMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No hay sesión");
      const lastSync = profileQ.data?.health_last_synced_at
        ? new Date(profileQ.data.health_last_synced_at)
        : null;
      const from = lastSync ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();

      const metrics: HealthMetric[] = [
        "heart_rate",
        "spo2",
        "blood_pressure",
        "temperature",
        "glucose",
        "steps",
        "sleep",
      ];

      const results: HealthSample[][] = await Promise.all(
        metrics.map((m) => readSamples(m, from, to))
      );
      const sourceTag = platform === "ios" ? "apple_health" : "health_connect";

      let total = 0;
      const insertOrUpsert = async (table: string, rows: any[]) => {
        if (!rows.length) return;
        const { error } = await supabase.from(table as any).upsert(rows as any, {
          onConflict: "external_uuid",
          ignoreDuplicates: true,
        });
        if (error) throw error;
        total += rows.length;
      };

      // heart rate
      await insertOrUpsert(
        "heart_rate_readings",
        results[0].map((s) => ({
          patient_id: user.id,
          bpm: Math.round(s.value),
          measured_at: s.measured_at,
          source: sourceTag,
          device_name: s.device_name ?? null,
          external_uuid: s.external_uuid,
        }))
      );

      // spo2
      await insertOrUpsert(
        "spo2_readings",
        results[1].map((s) => ({
          patient_id: user.id,
          created_by: user.id,
          spo2: Math.round(s.value),
          taken_at: s.measured_at,
          source: sourceTag,
          device_name: s.device_name ?? null,
          external_uuid: s.external_uuid,
        }))
      );

      // blood pressure
      await insertOrUpsert(
        "blood_pressure_readings",
        results[2]
          .filter((s) => s.value2)
          .map((s) => ({
            patient_id: user.id,
            created_by: user.id,
            systolic: Math.round(s.value),
            diastolic: Math.round(s.value2!),
            taken_at: s.measured_at,
            source: sourceTag,
            device_name: s.device_name ?? null,
            external_uuid: s.external_uuid,
          }))
      );

      // temperature
      await insertOrUpsert(
        "temperature_readings",
        results[3].map((s) => ({
          patient_id: user.id,
          created_by: user.id,
          temperature_c: s.value,
          taken_at: s.measured_at,
          source: sourceTag,
          device_name: s.device_name ?? null,
          external_uuid: s.external_uuid,
        }))
      );

      // glucose
      await insertOrUpsert(
        "glucose_readings",
        results[4].map((s) => ({
          patient_id: user.id,
          created_by: user.id,
          glucose_mgdl: Math.round(s.value),
          taken_at: s.measured_at,
          source: sourceTag,
          device_name: s.device_name ?? null,
          external_uuid: s.external_uuid,
        }))
      );

      // activity (steps + sleep aggregated per day)
      const byDay = new Map<string, any>();
      for (const s of results[5]) {
        const day = s.measured_at.slice(0, 10);
        const row = byDay.get(day) ?? {
          patient_id: user.id,
          fecha: day,
          source: sourceTag,
          device_name: s.device_name ?? null,
          external_uuid: `${sourceTag}-steps-${day}-${user.id}`,
        };
        row.steps = (row.steps ?? 0) + Math.round(s.value);
        byDay.set(day, row);
      }
      for (const s of results[6]) {
        const day = s.measured_at.slice(0, 10);
        const row = byDay.get(day) ?? {
          patient_id: user.id,
          fecha: day,
          source: sourceTag,
          device_name: s.device_name ?? null,
          external_uuid: `${sourceTag}-sleep-${day}-${user.id}`,
        };
        row.sleep_minutes = (row.sleep_minutes ?? 0) + Math.round(s.value);
        byDay.set(day, row);
      }
      await insertOrUpsert("activity_readings", Array.from(byDay.values()));

      await supabase
        .from("profiles")
        .update({ health_last_synced_at: to.toISOString() })
        .eq("user_id", user.id);

      return { total, since: from.toISOString() };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-health"] });
      qc.invalidateQueries({ queryKey: ["spo2"] });
      qc.invalidateQueries({ queryKey: ["blood-pressure"] });
      qc.invalidateQueries({ queryKey: ["glucose"] });
      qc.invalidateQueries({ queryKey: ["temperature"] });
      qc.invalidateQueries({ queryKey: ["heart_rate_readings"] });
      qc.invalidateQueries({ queryKey: ["unified-readings"] });
      qc.invalidateQueries({ queryKey: ["historial-salud-appointments"] });
    },
  });

  const disconnectMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No hay sesión");
      const sources = ["apple_health", "health_connect"];
      const tables = [
        "heart_rate_readings",
        "spo2_readings",
        "blood_pressure_readings",
        "temperature_readings",
        "glucose_readings",
        "activity_readings",
      ] as const;

      let deleted = 0;
      for (const t of tables) {
        const { error, count } = await supabase
          .from(t as any)
          .delete({ count: "exact" })
          .eq("patient_id", user.id)
          .in("source", sources)
          .not("external_uuid", "is", null);
        if (error) throw error;
        deleted += count ?? 0;
      }

      const { error: pErr } = await supabase
        .from("profiles")
        .update({ health_last_synced_at: null })
        .eq("user_id", user.id);
      if (pErr) throw pErr;

      return { deleted };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-health"] });
      qc.invalidateQueries({ queryKey: ["spo2"] });
      qc.invalidateQueries({ queryKey: ["blood-pressure"] });
      qc.invalidateQueries({ queryKey: ["glucose"] });
      qc.invalidateQueries({ queryKey: ["temperature"] });
      qc.invalidateQueries({ queryKey: ["heart_rate_readings"] });
      qc.invalidateQueries({ queryKey: ["unified-readings"] });
    },
  });

  return {
    platform,
    available: availabilityQ.data ?? false,
    lastSyncedAt: profileQ.data?.health_last_synced_at ?? null,
    requestPerms,
    sync: syncMut,
    disconnect: disconnectMut,
  };
}
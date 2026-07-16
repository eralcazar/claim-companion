import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BleConnection,
  BleParsed,
  BleService,
  BLE_SERVICE_UUIDS,
  isBleAvailable,
  isIOSSafari,
  makeExternalUuid,
  requestBleDevice,
} from "@/lib/ble";

export type SavedBleDevice = {
  id: string;
  user_id: string;
  device_id: string;
  name: string | null;
  service_uuid: string | null;
  is_whitelisted: boolean;
  last_connected_at: string | null;
};

export type BleKnownDevice = {
  id: string;
  name_pattern: string;
  vendor: string | null;
  service_uuid: string;
  notes: string | null;
};

export function useBleAvailability() {
  return {
    available: isBleAvailable(),
    iosSafari: isIOSSafari(),
  };
}

export function useSavedBleDevices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_ble_devices", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_ble_devices" as any)
        .select("*")
        .order("last_connected_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedBleDevice[];
    },
  });
}

export function useKnownBleDevices() {
  return useQuery({
    queryKey: ["ble_known_devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ble_known_devices" as any)
        .select("*")
        .order("vendor");
      if (error) throw error;
      return (data ?? []) as unknown as BleKnownDevice[];
    },
  });
}

function matchesWhitelist(name: string | null, service: BleService, known: BleKnownDevice[]): boolean {
  if (!name) return false;
  return known.some((k) => {
    if (k.service_uuid.toLowerCase() !== BLE_SERVICE_UUIDS[service]) return false;
    const pattern = k.name_pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
    return new RegExp(`^${pattern}$`, "i").test(name);
  });
}

/**
 * Saves a BLE reading into the appropriate table.
 * @param targetPatientId - which patient owns the reading (defaults to current user).
 */
async function persistReading(params: {
  parsed: BleParsed;
  deviceId: string;
  deviceName: string | null;
  createdBy: string;
  targetPatientId: string;
}) {
  const { parsed, deviceId, deviceName, createdBy, targetPatientId } = params;
  const external_uuid = await makeExternalUuid(deviceId, parsed);

  if (parsed.kind === "blood_pressure") {
    const { error } = await supabase.from("blood_pressure_readings" as any).upsert(
      {
        patient_id: targetPatientId,
        taken_at: parsed.measured_at,
        systolic: parsed.systolic,
        diastolic: parsed.diastolic,
        pulse: parsed.pulse ?? null,
        source: "ble",
        device_name: deviceName,
        external_uuid,
        requires_review: true,
        created_by: createdBy,
      },
      { onConflict: "external_uuid" },
    );
    if (error) throw error;
  } else {
    // spo2 readings; oxímetro entra directo (sin revisión)
    const { error } = await supabase.from("spo2_readings" as any).upsert(
      {
        patient_id: targetPatientId,
        taken_at: parsed.measured_at,
        spo2: parsed.spo2,
        pulse: parsed.pulse ?? null,
        source: "ble",
        device_name: deviceName,
        external_uuid,
        created_by: createdBy,
      },
      { onConflict: "external_uuid" },
    );
    if (error) throw error;
  }
}

/**
 * High-level BLE session hook: request, connect, listen, save.
 */
export function useBleSession(opts?: { targetPatientId?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const connRef = useRef<BleConnection | null>(null);
  const [connected, setConnected] = useState<{ device_id: string; name: string | null; service: BleService } | null>(null);
  const [lastReading, setLastReading] = useState<BleParsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const knownQ = useKnownBleDevices();

  const start = useMutation({
    mutationFn: async (service: BleService) => {
      setError(null);
      if (!user?.id) throw new Error("Sesión requerida");
      const conn = await requestBleDevice(service);
      connRef.current = conn;
      setConnected({ device_id: conn.device.device_id, name: conn.device.name, service });

      const targetPatientId = opts?.targetPatientId ?? user.id;
      const known = knownQ.data ?? [];
      const isWhite = matchesWhitelist(conn.device.name, service, known);

      // Save/update the device for future reconnection (only for the current user)
      await supabase.from("user_ble_devices" as any).upsert(
        {
          user_id: user.id,
          device_id: conn.device.device_id,
          name: conn.device.name,
          service_uuid: conn.device.service_uuid,
          is_whitelisted: isWhite,
          last_connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,device_id" },
      );
      qc.invalidateQueries({ queryKey: ["user_ble_devices"] });

      conn.onMeasurement(async (parsed) => {
        setLastReading(parsed);
        try {
          await persistReading({
            parsed,
            deviceId: conn.device.device_id,
            deviceName: conn.device.name,
            createdBy: user.id,
            targetPatientId,
          });
          if (parsed.kind === "blood_pressure") {
            qc.invalidateQueries({ queryKey: ["blood_pressure_readings", targetPatientId] });
            qc.invalidateQueries({ queryKey: ["bp_pending_review", targetPatientId] });
          } else {
            qc.invalidateQueries({ queryKey: ["spo2_readings", targetPatientId] });
          }
        } catch (e: any) {
          setError(e?.message ?? "Error al guardar lectura");
        }
      });
      return conn.device;
    },
    onError: (e: any) => setError(e?.message ?? "Error BLE"),
  });

  const disconnect = useCallback(async () => {
    if (connRef.current) {
      await connRef.current.disconnect();
      connRef.current = null;
    }
    setConnected(null);
  }, []);

  return { start, disconnect, connected, lastReading, error };
}

export function useForgetBleDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_ble_devices" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_ble_devices"] }),
  });
}

export function useBpPendingReview(patientId: string | undefined) {
  return useQuery({
    queryKey: ["bp_pending_review", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blood_pressure_readings" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .eq("requires_review", true)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useReviewBpReading() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "validate" | "discard" }) => {
      if (action === "discard") {
        const { error } = await supabase.from("blood_pressure_readings" as any).delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blood_pressure_readings" as any)
          .update({ requires_review: false, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["bp_pending_review"] });
      qc.invalidateQueries({ queryKey: ["blood_pressure_readings"] });
    },
  });
}
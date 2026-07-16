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
  brand?: string | null;
  model?: string | null;
  measurement_types?: string[];
  verified?: boolean;
  blocked?: boolean;
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

function findWhitelistMatch(name: string | null, service: BleService, known: BleKnownDevice[]): BleKnownDevice | null {
  if (!name) return null;
  return known.find((k) => {
    if (k.service_uuid.toLowerCase() !== BLE_SERVICE_UUIDS[service]) return false;
    const pattern = k.name_pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*");
    return new RegExp(`^${pattern}$`, "i").test(name);
  }) ?? null;
}

/** Admin CRUD for the BLE whitelist catalog. */
export function useAdminBleKnownDevices() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin_ble_known_devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ble_known_devices" as any)
        .select("*")
        .order("brand", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BleKnownDevice[];
    },
  });
  const upsert = useMutation({
    mutationFn: async (row: Partial<BleKnownDevice> & { id?: string }) => {
      const payload: any = { ...row };
      if (!payload.id) delete payload.id;
      const { error } = await supabase.from("ble_known_devices" as any).upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_ble_known_devices"] });
      qc.invalidateQueries({ queryKey: ["ble_known_devices"] });
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ble_known_devices" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_ble_known_devices"] });
      qc.invalidateQueries({ queryKey: ["ble_known_devices"] });
    },
  });
  return { list, upsert, remove };
}

/** Verification status of a saved user device against the admin whitelist. */
export function useBleDeviceStatus(deviceName: string | null, serviceUuid: string | null) {
  const known = useKnownBleDevices();
  if (!deviceName || !serviceUuid || !known.data) return { verified: false, blocked: false } as const;
  const service = (Object.entries(BLE_SERVICE_UUIDS).find(([, v]) => v === serviceUuid)?.[0]) as BleService | undefined;
  if (!service) return { verified: false, blocked: false } as const;
  const match = findWhitelistMatch(deviceName, service, known.data);
  return {
    verified: !!match?.verified,
    blocked: !!match?.blocked,
    match: match ?? null,
  } as const;
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
    // SpO2: valores anormales (<92%) requieren revisión clínica
    const abnormal = parsed.spo2 < 92;
    const { error } = await supabase.from("spo2_readings" as any).upsert(
      {
        patient_id: targetPatientId,
        taken_at: parsed.measured_at,
        spo2: parsed.spo2,
        pulse: parsed.pulse ?? null,
        source: "ble",
        device_name: deviceName,
        external_uuid,
        requires_review: abnormal,
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
      const match = findWhitelistMatch(conn.device.name, service, known);
      if (match?.blocked) {
        await conn.disconnect();
        connRef.current = null;
        setConnected(null);
        throw new Error("Dispositivo bloqueado por el administrador.");
      }
      const isWhite = !!match?.verified;

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

/**
 * Desvincula un dispositivo BLE y elimina TODAS las lecturas asociadas a su external_uuid en
 * las tablas clínicas correspondientes. Sólo el dueño de las lecturas puede ejecutarlo.
 */
export function useUnlinkBleDevice() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, deviceId }: { id: string; deviceId: string }) => {
      if (!user?.id) throw new Error("Sesión requerida");
      const tables = [
        "blood_pressure_readings",
        "spo2_readings",
        "temperature_readings",
        "glucose_readings",
        "heart_rate_readings",
        "activity_readings",
      ] as const;
      for (const t of tables) {
        await supabase
          .from(t as any)
          .delete()
          .eq("patient_id", user.id)
          .like("external_uuid", `%${deviceId}%`);
      }
      const { error } = await supabase.from("user_ble_devices" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_ble_devices"] });
      qc.invalidateQueries({ queryKey: ["blood_pressure_readings"] });
      qc.invalidateQueries({ queryKey: ["spo2_readings"] });
      qc.invalidateQueries({ queryKey: ["temperature_readings"] });
      qc.invalidateQueries({ queryKey: ["glucose_readings"] });
      qc.invalidateQueries({ queryKey: ["heart_rate_readings"] });
      qc.invalidateQueries({ queryKey: ["activity_readings"] });
      qc.invalidateQueries({ queryKey: ["ble_pending_review"] });
    },
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

/** Tipo unificado de lecturas pendientes de revisión clínica desde BLE. */
export type PendingReviewKind = "blood_pressure" | "spo2" | "temperature" | "activity";

const KIND_TABLE: Record<PendingReviewKind, string> = {
  blood_pressure: "blood_pressure_readings",
  spo2: "spo2_readings",
  temperature: "temperature_readings",
  activity: "activity_readings",
};

export function useBlePendingReview(patientId: string | undefined) {
  return useQuery({
    queryKey: ["ble_pending_review", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const kinds: PendingReviewKind[] = ["blood_pressure", "spo2", "temperature", "activity"];
      const all: Array<any & { kind: PendingReviewKind }> = [];
      for (const kind of kinds) {
        const { data, error } = await supabase
          .from(KIND_TABLE[kind] as any)
          .select("*")
          .eq("patient_id", patientId!)
          .eq("requires_review", true)
          .order("taken_at", { ascending: false });
        if (error) continue;
        (data ?? []).forEach((r: any) => all.push({ ...r, kind }));
      }
      return all.sort((a, b) => (a.taken_at < b.taken_at ? 1 : -1));
    },
  });
}

export function useReviewReading() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      kind,
      id,
      action,
      notes,
    }: {
      kind: PendingReviewKind;
      id: string;
      action: "validate" | "discard";
      notes?: string;
    }) => {
      const table = KIND_TABLE[kind];
      if (action === "discard") {
        const { error } = await supabase.from(table as any).delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(table as any)
          .update({
            requires_review: false,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id ?? null,
            review_notes: notes ?? null,
          })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ble_pending_review"] });
      qc.invalidateQueries({ queryKey: ["bp_pending_review"] });
      qc.invalidateQueries({ queryKey: ["blood_pressure_readings"] });
      qc.invalidateQueries({ queryKey: ["spo2_readings"] });
      qc.invalidateQueries({ queryKey: ["temperature_readings"] });
      qc.invalidateQueries({ queryKey: ["activity_readings"] });
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
import { useCallback, useState } from "react";
import {
  BleService,
  BLE_CHAR_UUIDS,
  BLE_SERVICE_UUIDS,
  isBleAvailable,
  isWebBluetoothAvailable,
  parseBloodPressure,
  parsePulseOximeter,
} from "@/lib/ble";
import { useBleTestSettings } from "@/hooks/useBleTestSettings";
import { logBleConnectionError, useUpsertBlePairing } from "@/hooks/useBlePairings";

export type TestStatus = "idle" | "scanning" | "reading" | "success" | "error";

export type TestResult = {
  service: BleService;
  deviceName: string | null;
  deviceId: string;
  sample?: string;
  error?: string;
  errorCode?: string;
  attempts?: number;
};

/**
 * Ejecuta un escaneo corto, se conecta, intenta leer una muestra y desconecta.
 * Devuelve estado + resultado (ok/error). Timeout de 8s para la primera notificación.
 */
export function useBleConnectionTest(opts?: { patientId?: string | null }) {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [result, setResult] = useState<TestResult | null>(null);
  const { settings } = useBleTestSettings();
  const upsertPairing = useUpsertBlePairing();

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
  }, []);

  const test = useCallback(async (service: BleService) => {
    setResult(null);
    if (!isBleAvailable()) {
      setStatus("error");
      setResult({ service, deviceName: null, deviceId: "", error: "Bluetooth no disponible en este navegador", errorCode: "unavailable" });
      return;
    }
    if (!isWebBluetoothAvailable()) {
      setStatus("error");
      setResult({ service, deviceName: null, deviceId: "", error: "Web Bluetooth no soportado. Usa la app nativa.", errorCode: "unsupported" });
      return;
    }

    setStatus("scanning");
    let device: any = null;
    let characteristic: any = null;
    let lastError: any = null;
    let errorCode = "unknown";
    const maxRetries = Math.max(1, settings.max_retries);
    let attempt = 0;

    try {
      // @ts-expect-error - navigator.bluetooth
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUIDS[service]] }],
        optionalServices: [BLE_SERVICE_UUIDS[service]],
      });
    } catch (e: any) {
      const msg = e?.name === "NotFoundError" ? "Selección cancelada por el usuario" : (e?.message ?? "Error desconocido");
      errorCode = e?.name === "NotFoundError" ? "user_cancelled" : "scan_failed";
      setResult({ service, deviceName: null, deviceId: "", error: msg, errorCode, attempts: 0 });
      setStatus("error");
      if (opts?.patientId && errorCode !== "user_cancelled") {
        await logBleConnectionError({ patient_id: opts.patientId, service_type: service, error_code: errorCode, error_message: msg }).catch(() => {});
      }
      return;
    }

    while (attempt < maxRetries) {
      attempt++;
      setStatus("reading");
      try {
        const server = await device.gatt.connect();
        const gattService = await server.getPrimaryService(BLE_SERVICE_UUIDS[service]);
        characteristic = await gattService.getCharacteristic(BLE_CHAR_UUIDS[service]);
        await characteristic.startNotifications();

        const sample = await new Promise<string>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error(`Timeout: no se recibió muestra en ${Math.round(settings.read_timeout_ms / 1000)}s`)),
            settings.read_timeout_ms,
          );
          const handler = (event: any) => {
            try {
              const value: DataView = event.target.value;
              const parsed = service === "blood_pressure"
                ? parseBloodPressure(value)
                : parsePulseOximeter(value);
              const label = parsed.kind === "blood_pressure"
                ? `${parsed.systolic}/${parsed.diastolic} mmHg`
                : `SpO₂ ${parsed.spo2}%`;
              clearTimeout(timer);
              characteristic.removeEventListener("characteristicvaluechanged", handler);
              resolve(label);
            } catch (e: any) {
              clearTimeout(timer);
              reject(e);
            }
          };
          characteristic.addEventListener("characteristicvaluechanged", handler);
        });

        setResult({ service, deviceName: device.name ?? null, deviceId: device.id, sample, attempts: attempt });
        setStatus("success");

        if (opts?.patientId) {
          upsertPairing.mutate({
            patient_id: opts.patientId,
            external_uuid: device.id,
            device_name: device.name ?? null,
            service_type: service,
            last_status: "ok",
          });
        }
        try { await characteristic?.stopNotifications(); } catch { /* noop */ }
        try { device?.gatt?.disconnect(); } catch { /* noop */ }
        return;
      } catch (e: any) {
        lastError = e;
        errorCode = /timeout/i.test(e?.message ?? "") ? "timeout" : "gatt_failed";
        try { await characteristic?.stopNotifications(); } catch { /* noop */ }
        try { device?.gatt?.disconnect(); } catch { /* noop */ }
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, settings.retry_delay_ms));
        }
      }
    }

    const errMsg = lastError?.message ?? "Error desconocido";
    setResult({
      service,
      deviceName: device?.name ?? null,
      deviceId: device?.id ?? "",
      error: errMsg,
      errorCode,
      attempts: attempt,
    });
    setStatus("error");
    if (opts?.patientId) {
      await logBleConnectionError({
        patient_id: opts.patientId,
        external_uuid: device?.id ?? null,
        service_type: service,
        error_code: errorCode,
        error_message: errMsg,
      }).catch(() => {});
      upsertPairing.mutate({
        patient_id: opts.patientId,
        external_uuid: device?.id ?? "unknown",
        device_name: device?.name ?? null,
        service_type: service,
        last_status: "error",
        last_error: errMsg,
      });
    }
  }, [settings, opts?.patientId, upsertPairing]);

  return { status, result, test, reset };
}
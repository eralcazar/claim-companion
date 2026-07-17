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

export type TestStatus = "idle" | "scanning" | "reading" | "success" | "error";

export type TestResult = {
  service: BleService;
  deviceName: string | null;
  deviceId: string;
  sample?: string;
  error?: string;
};

/**
 * Ejecuta un escaneo corto, se conecta, intenta leer una muestra y desconecta.
 * Devuelve estado + resultado (ok/error). Timeout de 8s para la primera notificación.
 */
export function useBleConnectionTest() {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [result, setResult] = useState<TestResult | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
  }, []);

  const test = useCallback(async (service: BleService) => {
    setResult(null);
    if (!isBleAvailable()) {
      setStatus("error");
      setResult({ service, deviceName: null, deviceId: "", error: "Bluetooth no disponible en este navegador" });
      return;
    }
    if (!isWebBluetoothAvailable()) {
      setStatus("error");
      setResult({ service, deviceName: null, deviceId: "", error: "Web Bluetooth no soportado. Usa la app nativa." });
      return;
    }

    setStatus("scanning");
    let device: any = null;
    let characteristic: any = null;
    try {
      // @ts-expect-error - navigator.bluetooth
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUIDS[service]] }],
        optionalServices: [BLE_SERVICE_UUIDS[service]],
      });
      setStatus("reading");
      const server = await device.gatt.connect();
      const gattService = await server.getPrimaryService(BLE_SERVICE_UUIDS[service]);
      characteristic = await gattService.getCharacteristic(BLE_CHAR_UUIDS[service]);
      await characteristic.startNotifications();

      const sample = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timeout: no se recibió muestra en 8s")), 8000);
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

      setResult({
        service,
        deviceName: device.name ?? null,
        deviceId: device.id,
        sample,
      });
      setStatus("success");
    } catch (e: any) {
      setResult({
        service,
        deviceName: device?.name ?? null,
        deviceId: device?.id ?? "",
        error: e?.name === "NotFoundError" ? "Selección cancelada por el usuario" : (e?.message ?? "Error desconocido"),
      });
      setStatus("error");
    } finally {
      try { await characteristic?.stopNotifications(); } catch { /* noop */ }
      try { device?.gatt?.disconnect(); } catch { /* noop */ }
    }
  }, []);

  return { status, result, test, reset };
}
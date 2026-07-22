import { Capacitor } from "@capacitor/core";

export type BleService = "blood_pressure" | "pulse_oximeter" | "heart_rate";

export const BLE_SERVICE_UUIDS: Record<BleService, string> = {
  blood_pressure: "00001810-0000-1000-8000-00805f9b34fb",
  pulse_oximeter: "00001822-0000-1000-8000-00805f9b34fb",
  // Heart Rate Service (0x180D)
  heart_rate: "0000180d-0000-1000-8000-00805f9b34fb",
};

export const BLE_CHAR_UUIDS: Record<BleService, string> = {
  // Blood Pressure Measurement
  blood_pressure: "00002a35-0000-1000-8000-00805f9b34fb",
  // PLX Continuous Measurement
  pulse_oximeter: "00002a5f-0000-1000-8000-00805f9b34fb",
  // Heart Rate Measurement (0x2A37)
  heart_rate: "00002a37-0000-1000-8000-00805f9b34fb",
};

export type BpParsed = {
  kind: "blood_pressure";
  systolic: number;
  diastolic: number;
  map?: number;
  pulse?: number;
  measured_at: string;
};

export type SpO2Parsed = {
  kind: "spo2";
  spo2: number;
  pulse?: number;
  measured_at: string;
};

export type HrParsed = {
  kind: "heart_rate";
  bpm: number;
  /** Energía gastada (kJ), opcional según el sensor. */
  energy_kj?: number;
  /** Contacto de la piel: true/false o undefined si no se reporta. */
  contact?: boolean;
  measured_at: string;
};

export type BleParsed = BpParsed | SpO2Parsed | HrParsed;

// IEEE-11073 16-bit SFLOAT
function parseSFloat(view: DataView, offset: number): number {
  const raw = view.getUint16(offset, true);
  let mantissa = raw & 0x0fff;
  let exponent = raw >> 12;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  if (exponent >= 0x0008) exponent -= 0x0010;
  return mantissa * Math.pow(10, exponent);
}

/** Parses the Blood Pressure Measurement characteristic (0x2A35). */
export function parseBloodPressure(data: DataView): BpParsed {
  const flags = data.getUint8(0);
  const kPa = (flags & 0x01) === 1; // unit
  const hasTimestamp = (flags & 0x02) === 2;
  const hasPulse = (flags & 0x04) === 4;

  let sys = parseSFloat(data, 1);
  let dia = parseSFloat(data, 3);
  let map = parseSFloat(data, 5);
  if (kPa) {
    // 1 kPa ≈ 7.50062 mmHg
    sys *= 7.50062; dia *= 7.50062; map *= 7.50062;
  }
  let offset = 7;
  let measured_at = new Date().toISOString();
  if (hasTimestamp) {
    const y = data.getUint16(offset, true); offset += 2;
    const mo = data.getUint8(offset); offset += 1;
    const d = data.getUint8(offset); offset += 1;
    const h = data.getUint8(offset); offset += 1;
    const mi = data.getUint8(offset); offset += 1;
    const s = data.getUint8(offset); offset += 1;
    if (y > 1990) measured_at = new Date(Date.UTC(y, mo - 1, d, h, mi, s)).toISOString();
  }
  let pulse: number | undefined;
  if (hasPulse) pulse = parseSFloat(data, offset);

  return {
    kind: "blood_pressure",
    systolic: Math.round(sys),
    diastolic: Math.round(dia),
    map: Math.round(map),
    pulse: pulse != null ? Math.round(pulse) : undefined,
    measured_at,
  };
}

/** Parses the PLX Continuous Measurement (0x2A5F) — SpO2 & pulse are SFLOATs. */
export function parsePulseOximeter(data: DataView): SpO2Parsed {
  // Layout: flags(1) | SpO2 SFLOAT(2) | Pulse SFLOAT(2) | ...
  const spo2 = parseSFloat(data, 1);
  const pulse = parseSFloat(data, 3);
  return {
    kind: "spo2",
    spo2: Math.round(spo2),
    pulse: isFinite(pulse) ? Math.round(pulse) : undefined,
    measured_at: new Date().toISOString(),
  };
}

/**
 * Parses the Heart Rate Measurement characteristic (0x2A37).
 * Flags (byte 0):
 *   bit 0: HR value format (0 = uint8, 1 = uint16 LE)
 *   bit 1-2: sensor contact status
 *   bit 3: energy expended present (uint16 LE, kJ)
 *   bit 4: RR-intervals present (ignoradas aquí)
 */
export function parseHeartRate(data: DataView): HrParsed {
  const flags = data.getUint8(0);
  const is16 = (flags & 0x01) === 1;
  const contactSupported = (flags & 0x04) === 0x04;
  const contactDetected = (flags & 0x02) === 0x02;
  let offset = 1;
  const bpm = is16 ? data.getUint16(offset, true) : data.getUint8(offset);
  offset += is16 ? 2 : 1;
  const hasEnergy = (flags & 0x08) === 0x08;
  let energy_kj: number | undefined;
  if (hasEnergy && data.byteLength >= offset + 2) {
    energy_kj = data.getUint16(offset, true);
    offset += 2;
  }
  return {
    kind: "heart_rate",
    bpm: Math.max(0, Math.round(bpm)),
    energy_kj,
    contact: contactSupported ? contactDetected : undefined,
    measured_at: new Date().toISOString(),
  };
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isWebBluetoothAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  // iOS Safari does not implement navigator.bluetooth
  // @ts-expect-error - navigator.bluetooth is not typed
  return !!navigator.bluetooth;
}

export function isBleAvailable(): boolean {
  return isNative() || isWebBluetoothAvailable();
}

export type BleDeviceInfo = {
  device_id: string;
  name: string | null;
  service_uuid: string;
};

export type BleConnection = {
  device: BleDeviceInfo;
  service: BleService;
  onMeasurement: (cb: (m: BleParsed) => void) => () => void;
  disconnect: () => Promise<void>;
};

/** Deterministic uuid per (device + measurement) for idempotent upserts. */
export async function makeExternalUuid(deviceId: string, m: BleParsed): Promise<string> {
  const payload = `${deviceId}|${m.kind}|${m.measured_at}`;
  const buf = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  const bytes = new Uint8Array(hash);
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  // Format as UUID
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Requests a device and returns a live connection with a measurement listener.
 * Web implementation only for now (Chrome/Edge/Android Chrome). Native path can be
 * added later via @capacitor-community/bluetooth-le without changing callers.
 */
export async function requestBleDevice(service: BleService): Promise<BleConnection> {
  if (isNative()) {
    return requestNative(service);
  }
  if (!isWebBluetoothAvailable()) {
    throw new Error("Web Bluetooth no está disponible en este navegador");
  }
  // @ts-expect-error - Web Bluetooth types not bundled
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [BLE_SERVICE_UUIDS[service]] }],
    optionalServices: [BLE_SERVICE_UUIDS[service]],
  });
  const server = await device.gatt!.connect();
  const gattService = await server.getPrimaryService(BLE_SERVICE_UUIDS[service]);
  const characteristic = await gattService.getCharacteristic(BLE_CHAR_UUIDS[service]);
  await characteristic.startNotifications();

  const listeners = new Set<(m: BleParsed) => void>();
  const handler = (event: any) => {
    const value: DataView = event.target.value;
    try {
      const parsed =
        service === "blood_pressure"
          ? parseBloodPressure(value)
          : service === "heart_rate"
            ? parseHeartRate(value)
            : parsePulseOximeter(value);
      listeners.forEach((cb) => cb(parsed));
    } catch (e) {
      console.error("BLE parse error", e);
    }
  };
  characteristic.addEventListener("characteristicvaluechanged", handler);

  return {
    device: {
      device_id: device.id,
      name: device.name ?? null,
      service_uuid: BLE_SERVICE_UUIDS[service],
    },
    service,
    onMeasurement: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    disconnect: async () => {
      try {
        characteristic.removeEventListener("characteristicvaluechanged", handler);
        await characteristic.stopNotifications();
      } catch { /* noop */ }
      try { device.gatt?.disconnect(); } catch { /* noop */ }
    },
  };
}

async function requestNative(service: BleService): Promise<BleConnection> {
  const mod = await import("@capacitor-community/bluetooth-le");
  const { BleClient } = mod;
  await BleClient.initialize({ androidNeverForLocation: true });
  const device = await BleClient.requestDevice({ services: [BLE_SERVICE_UUIDS[service]] });
  await BleClient.connect(device.deviceId);

  const listeners = new Set<(m: BleParsed) => void>();
  await BleClient.startNotifications(
    device.deviceId,
    BLE_SERVICE_UUIDS[service],
    BLE_CHAR_UUIDS[service],
    (value) => {
      try {
        const parsed =
          service === "blood_pressure"
            ? parseBloodPressure(value)
            : service === "heart_rate"
              ? parseHeartRate(value)
              : parsePulseOximeter(value);
        listeners.forEach((cb) => cb(parsed));
      } catch (e) {
        console.error("BLE parse error", e);
      }
    },
  );

  return {
    device: {
      device_id: device.deviceId,
      name: device.name ?? null,
      service_uuid: BLE_SERVICE_UUIDS[service],
    },
    service,
    onMeasurement: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    disconnect: async () => {
      try {
        await BleClient.stopNotifications(device.deviceId, BLE_SERVICE_UUIDS[service], BLE_CHAR_UUIDS[service]);
      } catch { /* noop */ }
      try { await BleClient.disconnect(device.deviceId); } catch { /* noop */ }
    },
  };
}

export function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari && !isNative();
}
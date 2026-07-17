/**
 * Catálogo estático de dispositivos BLE compatibles con CareCentral.
 * Se usa perfiles GATT estándar (BP 0x1810, PLX 0x1822, HTS 0x1809, HRS 0x180D).
 */
export type CompatibleReading = "spo2" | "blood_pressure" | "temperature" | "heart_rate";
export type PriceTier = "económico" | "medio" | "premium";

export type CompatibleDevice = {
  id: string;
  name: string;
  brand: string;
  readings: CompatibleReading[];
  gattService: string;
  priceTier: PriceTier;
  priceUsd?: string;
  tested: boolean;
  notes: string;
  url?: string;
};

export const COMPATIBLE_DEVICES: CompatibleDevice[] = [
  {
    id: "wellue-o2ring",
    name: "Wellue O2Ring",
    brand: "Wellue / Viatom",
    readings: ["spo2", "heart_rate"],
    gattService: "Pulse Oximeter Service (0x1822)",
    priceTier: "medio",
    priceUsd: "$140–160",
    tested: true,
    notes: "Oxímetro de anillo con SpO₂ y pulso continuos. Excelente estabilidad.",
    url: "https://getwellue.com/pages/o2ring-oxygen-monitor",
  },
  {
    id: "viatom-checkme-o2",
    name: "Viatom Checkme O2",
    brand: "Viatom",
    readings: ["spo2", "heart_rate"],
    gattService: "Pulse Oximeter Service (0x1822)",
    priceTier: "medio",
    priceUsd: "$80–100",
    tested: true,
    notes: "Oxímetro de muñeca con sensor de dedo. Perfil PLX estándar.",
  },
  {
    id: "berry-bm2000b",
    name: "Berry BM2000B",
    brand: "Berry Medical",
    readings: ["spo2", "heart_rate"],
    gattService: "Pulse Oximeter Service (0x1822)",
    priceTier: "económico",
    priceUsd: "$40–60",
    tested: false,
    notes: "Oxímetro de dedo económico con BLE estándar.",
  },
  {
    id: "omron-m7-intelli-it",
    name: "Omron M7 Intelli IT (HEM-7361T)",
    brand: "Omron",
    readings: ["blood_pressure", "heart_rate"],
    gattService: "Blood Pressure Service (0x1810)",
    priceTier: "premium",
    priceUsd: "$120–150",
    tested: true,
    notes: "Tensiómetro de brazo con detección de FA. Perfil BP estándar.",
    url: "https://www.omron-healthcare.com",
  },
  {
    id: "ad-ua-651ble",
    name: "A&D UA-651BLE",
    brand: "A&D Medical",
    readings: ["blood_pressure", "heart_rate"],
    gattService: "Blood Pressure Service (0x1810)",
    priceTier: "medio",
    priceUsd: "$70–90",
    tested: false,
    notes: "Tensiómetro clínico validado, BLE estándar.",
  },
  {
    id: "beurer-ft95",
    name: "Beurer FT 95",
    brand: "Beurer",
    readings: ["temperature"],
    gattService: "Health Thermometer Service (0x1809)",
    priceTier: "económico",
    priceUsd: "$35–50",
    tested: false,
    notes: "Termómetro infrarrojo con BLE (Health Thermometer Service).",
  },
];

export const READING_LABELS: Record<CompatibleReading, string> = {
  spo2: "SpO₂",
  blood_pressure: "Presión arterial",
  temperature: "Temperatura",
  heart_rate: "Frecuencia cardíaca",
};
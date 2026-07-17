/**
 * Catálogo estático de dispositivos y wearables compatibles con CareCentral.
 * Cubre BLE directo (perfiles GATT estándar) y wearables vía Health Connect / HealthKit.
 */
export type CompatibleReading = "spo2" | "blood_pressure" | "temperature" | "heart_rate" | "activity" | "sleep" | "weight";
export type PriceTier = "económico" | "medio" | "premium";
export type DeviceType = "oximeter" | "bp_monitor" | "thermometer" | "smartband" | "smartwatch" | "ring" | "scale";
export type ConnectionMethod = "ble_direct" | "health_connect" | "healthkit" | "vendor_app_bridge" | "not_compatible";
export type CompatibilityStatus = "verified" | "probable" | "community" | "incompatible";

export type CompatibleDevice = {
  id: string;
  name: string;
  brand: string;
  deviceType: DeviceType;
  connectionMethod: ConnectionMethod;
  compatibilityStatus: CompatibilityStatus;
  readings: CompatibleReading[];
  gattService?: string;
  syncSource: string;
  pairingSteps: string[];
  priceTier: PriceTier;
  priceUsd?: string;
  tested: boolean;
  notes: string;
  firmwareNote?: string;
  url?: string;
};

const BLE_STEPS = [
  "Activa el Bluetooth en tu teléfono o computadora (Chrome/Edge en desktop).",
  "Abre CareCentral y ve a Dispositivos → Probar conexión.",
  "Enciende el dispositivo y ponlo en modo emparejamiento.",
  "Selecciónalo del listado que aparece en el navegador.",
  "Realiza una medición y verifica que llegue a tu expediente.",
];

const HC_STEPS = [
  "Instala la app oficial del fabricante y empareja el dispositivo desde ahí.",
  "Otorga permisos a la app para escribir en Google Health Connect.",
  "En CareCentral, abre Historial de salud → Sincronizar wearables.",
  "Autoriza a CareCentral a leer Frecuencia cardíaca, SpO₂ y Actividad.",
  "Pulsa Sincronizar ahora para importar los datos.",
];

const HK_STEPS = [
  "Empareja el dispositivo con la app del fabricante o con Apple Watch.",
  "Verifica que los datos aparezcan en la app Salud de iOS.",
  "Abre CareCentral (iOS) → Historial de salud → Conectar HealthKit.",
  "Autoriza acceso de lectura a Frecuencia cardíaca, SpO₂ y Actividad.",
  "Pulsa Sincronizar ahora.",
];

const INCOMPAT_STEPS = [
  "Este modelo usa un protocolo BLE propietario no documentado.",
  "No es posible leerlo directamente desde el navegador ni desde Health Connect.",
  "Si te interesa esta marca, considera un modelo compatible listado arriba.",
];

export const COMPATIBLE_DEVICES: CompatibleDevice[] = [
  // === BLE directo (clínicos) ===
  {
    id: "wellue-o2ring",
    name: "Wellue O2Ring",
    brand: "Wellue / Viatom",
    deviceType: "ring",
    connectionMethod: "ble_direct",
    compatibilityStatus: "verified",
    readings: ["spo2", "heart_rate"],
    gattService: "Pulse Oximeter Service (0x1822)",
    syncSource: "Web Bluetooth (directo)",
    pairingSteps: BLE_STEPS,
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
    deviceType: "oximeter",
    connectionMethod: "ble_direct",
    compatibilityStatus: "verified",
    readings: ["spo2", "heart_rate"],
    gattService: "Pulse Oximeter Service (0x1822)",
    syncSource: "Web Bluetooth (directo)",
    pairingSteps: BLE_STEPS,
    priceTier: "medio",
    priceUsd: "$80–100",
    tested: true,
    notes: "Oxímetro de muñeca con sensor de dedo. Perfil PLX estándar.",
  },
  {
    id: "berry-bm2000b",
    name: "Berry BM2000B",
    brand: "Berry Medical",
    deviceType: "oximeter",
    connectionMethod: "ble_direct",
    compatibilityStatus: "probable",
    readings: ["spo2", "heart_rate"],
    gattService: "Pulse Oximeter Service (0x1822)",
    syncSource: "Web Bluetooth (directo)",
    pairingSteps: BLE_STEPS,
    priceTier: "económico",
    priceUsd: "$40–60",
    tested: false,
    notes: "Oxímetro de dedo económico con BLE estándar.",
  },
  {
    id: "omron-m7-intelli-it",
    name: "Omron M7 Intelli IT (HEM-7361T)",
    brand: "Omron",
    deviceType: "bp_monitor",
    connectionMethod: "ble_direct",
    compatibilityStatus: "verified",
    readings: ["blood_pressure", "heart_rate"],
    gattService: "Blood Pressure Service (0x1810)",
    syncSource: "Web Bluetooth (directo)",
    pairingSteps: BLE_STEPS,
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
    deviceType: "bp_monitor",
    connectionMethod: "ble_direct",
    compatibilityStatus: "probable",
    readings: ["blood_pressure", "heart_rate"],
    gattService: "Blood Pressure Service (0x1810)",
    syncSource: "Web Bluetooth (directo)",
    pairingSteps: BLE_STEPS,
    priceTier: "medio",
    priceUsd: "$70–90",
    tested: false,
    notes: "Tensiómetro clínico validado, BLE estándar.",
  },
  {
    id: "beurer-ft95",
    name: "Beurer FT 95",
    brand: "Beurer",
    deviceType: "thermometer",
    connectionMethod: "ble_direct",
    compatibilityStatus: "probable",
    readings: ["temperature"],
    gattService: "Health Thermometer Service (0x1809)",
    syncSource: "Web Bluetooth (directo)",
    pairingSteps: BLE_STEPS,
    priceTier: "económico",
    priceUsd: "$35–50",
    tested: false,
    notes: "Termómetro infrarrojo con BLE (Health Thermometer Service).",
  },

  // === Puente Health Connect (Android) ===
  {
    id: "xiaomi-band-9",
    name: "Xiaomi Smart Band 9",
    brand: "Xiaomi",
    deviceType: "smartband",
    connectionMethod: "health_connect",
    compatibilityStatus: "verified",
    readings: ["heart_rate", "spo2", "activity", "sleep"],
    syncSource: "Mi Fitness → Google Health Connect",
    pairingSteps: HC_STEPS,
    priceTier: "económico",
    priceUsd: "$40–55",
    tested: true,
    notes: "Smartband económica muy popular. Sincroniza con Mi Fitness y expone datos vía Health Connect.",
  },
  {
    id: "xiaomi-band-10",
    name: "Xiaomi Smart Band 10",
    brand: "Xiaomi",
    deviceType: "smartband",
    connectionMethod: "health_connect",
    compatibilityStatus: "probable",
    readings: ["heart_rate", "spo2", "activity", "sleep"],
    syncSource: "Mi Fitness → Google Health Connect",
    pairingSteps: HC_STEPS,
    priceTier: "económico",
    priceUsd: "$50–65",
    tested: false,
    notes: "Sucesora de la Band 9. Mismo flujo de sincronización.",
  },
  {
    id: "haylou-rs4-plus",
    name: "Haylou RS4 Plus",
    brand: "Haylou",
    deviceType: "smartwatch",
    connectionMethod: "health_connect",
    compatibilityStatus: "community",
    readings: ["heart_rate", "spo2", "activity", "sleep"],
    syncSource: "Haylou Fun → Google Health Connect",
    pairingSteps: HC_STEPS,
    priceTier: "económico",
    priceUsd: "$45–60",
    tested: false,
    notes: "Reloj económico chino. Requiere la app Haylou Fun y habilitar Health Connect.",
  },
  {
    id: "amazfit-bip-5",
    name: "Amazfit Bip 5",
    brand: "Amazfit / Zepp",
    deviceType: "smartwatch",
    connectionMethod: "health_connect",
    compatibilityStatus: "verified",
    readings: ["heart_rate", "spo2", "activity", "sleep"],
    syncSource: "Zepp App → Google Health Connect / Apple HealthKit",
    pairingSteps: HC_STEPS,
    priceTier: "medio",
    priceUsd: "$80–100",
    tested: true,
    notes: "Reloj asequible con buena cobertura de métricas. Zepp exporta a Health Connect y HealthKit.",
  },
  {
    id: "huawei-band-9",
    name: "Huawei Band 9",
    brand: "Huawei",
    deviceType: "smartband",
    connectionMethod: "vendor_app_bridge",
    compatibilityStatus: "community",
    readings: ["heart_rate", "spo2", "activity", "sleep"],
    syncSource: "Huawei Health (requiere puente manual, no expone Health Connect en todos los países)",
    pairingSteps: [
      "Empareja el Band 9 con Huawei Health.",
      "Exporta datos manualmente a CSV desde Huawei Health.",
      "En CareCentral, usa Historial de salud → Importar CSV para cargar frecuencia cardíaca.",
    ],
    priceTier: "económico",
    priceUsd: "$50–70",
    tested: false,
    notes: "Huawei Health no siempre se conecta a Health Connect. Recomendamos importación por CSV.",
  },

  // === Puente HealthKit (iOS) ===
  {
    id: "apple-watch-se",
    name: "Apple Watch SE (2ª gen)",
    brand: "Apple",
    deviceType: "smartwatch",
    connectionMethod: "healthkit",
    compatibilityStatus: "verified",
    readings: ["heart_rate", "activity", "sleep"],
    syncSource: "Apple Health (HealthKit)",
    pairingSteps: HK_STEPS,
    priceTier: "premium",
    priceUsd: "$249",
    tested: true,
    notes: "Se integra nativamente con HealthKit. Requiere app iOS de CareCentral (Capacitor).",
  },
  {
    id: "fitbit-charge-6",
    name: "Fitbit Charge 6",
    brand: "Fitbit (Google)",
    deviceType: "smartband",
    connectionMethod: "health_connect",
    compatibilityStatus: "verified",
    readings: ["heart_rate", "spo2", "activity", "sleep"],
    syncSource: "Fitbit App → Google Health Connect",
    pairingSteps: HC_STEPS,
    priceTier: "medio",
    priceUsd: "$120–160",
    tested: true,
    notes: "Excelente sensor cardíaco. Activa el puente Fitbit → Health Connect en la app Fitbit.",
  },
  {
    id: "pixel-watch-2",
    name: "Google Pixel Watch 2",
    brand: "Google",
    deviceType: "smartwatch",
    connectionMethod: "health_connect",
    compatibilityStatus: "verified",
    readings: ["heart_rate", "spo2", "activity", "sleep"],
    syncSource: "Fitbit App → Google Health Connect",
    pairingSteps: HC_STEPS,
    priceTier: "premium",
    priceUsd: "$299–349",
    tested: true,
    notes: "Integración nativa con Health Connect vía Fitbit.",
  },
  {
    id: "samsung-galaxy-watch-6",
    name: "Samsung Galaxy Watch 6",
    brand: "Samsung",
    deviceType: "smartwatch",
    connectionMethod: "health_connect",
    compatibilityStatus: "verified",
    readings: ["heart_rate", "spo2", "activity", "sleep"],
    syncSource: "Samsung Health → Google Health Connect",
    pairingSteps: HC_STEPS,
    priceTier: "premium",
    priceUsd: "$249–329",
    tested: false,
    notes: "Samsung Health exporta a Health Connect en Android 14+.",
  },

  // === Báscula ===
  {
    id: "xiaomi-body-scale-2",
    name: "Xiaomi Mi Body Composition Scale 2",
    brand: "Xiaomi",
    deviceType: "scale",
    connectionMethod: "health_connect",
    compatibilityStatus: "community",
    readings: ["weight"],
    syncSource: "Mi Fitness → Google Health Connect",
    pairingSteps: HC_STEPS,
    priceTier: "económico",
    priceUsd: "$25–35",
    tested: false,
    notes: "Báscula económica. El peso se sincroniza vía Mi Fitness → Health Connect.",
  },

  // === No compatibles ===
  {
    id: "colmi-p8",
    name: "Colmi P8 / P28 / Land 1",
    brand: "Colmi",
    deviceType: "smartwatch",
    connectionMethod: "not_compatible",
    compatibilityStatus: "incompatible",
    readings: [],
    syncSource: "Sin fuente compatible",
    pairingSteps: INCOMPAT_STEPS,
    priceTier: "económico",
    priceUsd: "$15–25",
    tested: false,
    notes: "Usa app propietaria (Da Fit / FitCloudPro) sin exportación oficial. Datos no importables a CareCentral.",
  },
  {
    id: "y68-d20",
    name: "Y68 / D20 (smartwatch genérico)",
    brand: "Genérico",
    deviceType: "smartwatch",
    connectionMethod: "not_compatible",
    compatibilityStatus: "incompatible",
    readings: [],
    syncSource: "Sin fuente compatible",
    pairingSteps: INCOMPAT_STEPS,
    priceTier: "económico",
    priceUsd: "$8–15",
    tested: false,
    notes: "Reloj genérico de bajo costo con BLE propietario. Recomendamos alternativas Xiaomi/Amazfit.",
  },
  {
    id: "fitpro-generic",
    name: "FitPro / QCY / genéricos con app FitPro",
    brand: "Genérico",
    deviceType: "smartband",
    connectionMethod: "not_compatible",
    compatibilityStatus: "incompatible",
    readings: [],
    syncSource: "Sin fuente compatible",
    pairingSteps: INCOMPAT_STEPS,
    priceTier: "económico",
    priceUsd: "$10–20",
    tested: false,
    notes: "Bandas que se emparejan con la app FitPro no exponen sus datos a Health Connect ni GATT estándar.",
  },
];

export const READING_LABELS: Record<CompatibleReading, string> = {
  spo2: "SpO₂",
  blood_pressure: "Presión arterial",
  temperature: "Temperatura",
  heart_rate: "Frecuencia cardíaca",
  activity: "Actividad",
  sleep: "Sueño",
  weight: "Peso",
};

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  oximeter: "Oxímetro",
  bp_monitor: "Tensiómetro",
  thermometer: "Termómetro",
  smartband: "Smartband",
  smartwatch: "Smartwatch",
  ring: "Anillo",
  scale: "Báscula",
};

export const CONNECTION_LABELS: Record<ConnectionMethod, string> = {
  ble_direct: "BLE directo",
  health_connect: "Health Connect",
  healthkit: "Apple HealthKit",
  vendor_app_bridge: "App del fabricante",
  not_compatible: "No compatible",
};

export const STATUS_LABELS: Record<CompatibilityStatus, string> = {
  verified: "Verificado",
  probable: "Probable",
  community: "Comunidad",
  incompatible: "No compatible",
};

export const STATUS_TONE: Record<CompatibilityStatus, "success" | "warning" | "info" | "danger"> = {
  verified: "success",
  probable: "info",
  community: "warning",
  incompatible: "danger",
};
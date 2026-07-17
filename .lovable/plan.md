
# Fase Wearables — Historial de Salud Unificado

Objetivo: consolidar datos de wearables (Apple HealthKit, Health Connect, BLE directo, carga manual) en un panel único de tendencias, integrado con citas y recordatorios.

## Alcance (5 entregables)

### 1. Panel "Historial de Salud" en el expediente
- Nueva ruta `/historial-salud` (y tab dentro de `PatientExpedienteTabs`).
- Consolida lecturas de: `heart_rate_readings`, `activity_readings`, `blood_pressure_readings`, `spo2_readings`, `glucose_readings`, `temperature_readings`.
- Gráficas Recharts con selector de rango (7d / 30d / 90d / custom) y filtro por tipo.
- Panel lateral que cruza lecturas con `appointments` próximas y `bp_reminder_schedules` / `medication_schedule` — resalta lecturas fuera de rango previas a una cita.
- Badge por lectura indicando la fuente: `healthkit` / `health_connect` / `ble` / `manual` / `csv`.

### 2. Verificador de compatibilidad de dispositivo BLE
- Nuevo componente `BleCompatibilityCheck.tsx` dentro de `/dispositivos`.
- Escaneo corto (5s), inspecciona `services` GATT y compara contra whitelist estándar (Heart Rate `0x180D`, Blood Pressure `0x1810`, Pulse Oximeter `0x1822`, Health Thermometer `0x1809`, Glucose `0x1808`, Battery `0x180F`).
- Resultado en 3 estados: **Compatible estándar** (servicio GATT reconocido), **Propietario** (solo servicios `0xFEE*` / custom UUID), **Desconocido**.
- Guarda el resultado en `ble_known_devices` (nueva columna `compatibility_status`).

### 3. Carga manual de HR / lecturas
- Formulario "Registrar lectura manual" en el panel de Historial: BPM, fecha/hora, contexto (reposo/ejercicio/post-cita), notas.
- Importador CSV con drag-and-drop: columnas `timestamp,bpm,context,notes`; preview de las primeras 10 filas, validación (Zod), commit por lotes de 100.
- Fuente marcada como `manual` o `csv` en `source` de `heart_rate_readings`.

### 4. Apple HealthKit (Capacitor)
- Integración con `capacitor-health` (ya instalado) para iOS.
- Solicitud de permisos: `heart_rate`, `steps`, `active_energy`, `resting_hr`, `sleep`, `blood_oxygen`.
- Botón "Sincronizar HealthKit" en `HealthDevicesPanel.tsx` — importa últimas 24h / 7d / 30d.
- Deduplicación por `source_uuid` (nueva columna en `heart_rate_readings` y `activity_readings`).

### 5. Health Connect (Android)
- Mismo hook `useHealthSync` con branch por plataforma (`Capacitor.getPlatform()`).
- Permisos Android 14+ vía `capacitor-health`.
- Panel de tendencias reutiliza la misma UI de (1); solo cambia el badge de fuente.

## Cambios de DB

```text
heart_rate_readings         + source_uuid text UNIQUE nullable, source text default 'ble'
activity_readings           + source_uuid text UNIQUE nullable
ble_known_devices           + compatibility_status text (standard|proprietary|unknown)
                            + compatibility_checked_at timestamptz
                            + gatt_services jsonb
```

Todos con RLS `auth.uid() = user_id` (siguiendo el patrón existente).

## Cambios de código (resumen)

```text
src/pages/HistorialSalud.tsx                  NEW  ruta consolidada
src/components/health/UnifiedTimelineChart.tsx NEW  Recharts multi-serie
src/components/health/ManualReadingForm.tsx    NEW  formulario + Zod
src/components/health/CsvImporter.tsx          NEW  drag-drop + preview
src/components/health/BleCompatibilityCheck.tsx NEW
src/hooks/useHealthSync.ts                     NEW  HealthKit + Health Connect
src/hooks/useUnifiedReadings.ts                NEW  agrega 6 tablas por rango
src/components/dashboard/HealthDevicesPanel.tsx EDIT  botones sync + compat
src/components/patient/PatientExpedienteTabs.tsx EDIT  nueva pestaña
src/App.tsx                                    EDIT  ruta /historial-salud
```

## Fuera de alcance (para no inflar)

- Fitbit OAuth (ya discutido; queda como fase aparte).
- Oura / Ultrahuman API.
- Alertas push automáticas por lecturas importadas (se reusa el sistema existente de `notifications`, sin nueva lógica).
- Cross-device analytics (correlación sueño↔presión) — futuro.

## Verificación

- Build limpio + tsgo.
- Test manual: registrar 3 lecturas manuales, importar CSV de 20 filas, verificar que aparecen en el timeline unificado con badges correctos, y que el verificador BLE distingue un Wellue O2Ring (estándar) de un smartband genérico (propietario).

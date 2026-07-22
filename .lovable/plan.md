# Plan: Diagnóstico avanzado de dispositivos wearables

Cinco entregables sobre el módulo de dispositivos/salud existente (`WearableConnectionTest`, `useHealthDevices`, `/dispositivos`). Todo se apila sin tocar los monitores clínicos actuales.

## 1. Historial de pruebas de conexión
- Nueva tabla `wearable_connection_tests` (id, user_id, tested_at, platform, availability, overall_status, duration_ms, notes) + tabla hija `wearable_connection_test_metrics` (test_id, metric, status, samples_count, last_value, last_at, error_code, error_message).
- Grants + RLS por `user_id`.
- Hook `useConnectionTestHistory` (list/insert). `WearableConnectionTest` guarda cada corrida al terminar.
- Pestaña **Historial** en `/dispositivos` con lista por fecha, chips por métrica (FC, pasos, sueño, SpO₂) y expand con detalle de error.

## 2. Reintentos automáticos de sync (Health Connect / Apple Health)
- Ampliar `useHealthDevices` con `useAutoRetrySync`: cuando `sync.mutateAsync` falla, agenda reintento exponencial (30s → 2m → 5m → 15m, máx 4 intentos) usando `setTimeout` + estado persistido en `localStorage` (clave por user).
- Se cancela al éxito manual o al desmontar. Cada intento registra un test en la tabla del punto 1 con motivo del fallo.
- Nuevo componente `AutoRetryStatusCard` que muestra: estado (esperando/reintentando/éxito/agotado), próximo intento, último motivo y botón "Reintentar ya" / "Cancelar reintentos".
- Se monta en `SyncStatusCard` como sección extra cuando `sync.isError`.

## 3. Informe PDF de la prueba
- `WearableConnectionTestPdf.tsx` con `jspdf` (ya usado en `MonitorPdfExport`): encabezado CareCentral, fecha, plataforma, resumen de compatibilidad y tabla por métrica (detectada/sin datos/error, samples, último valor, timestamp, código de error). Sección "Para soporte" con id de prueba, versión app, user agent.
- Botón "Descargar PDF" en el resultado de `WearableConnectionTest` y en cada fila del historial.

## 4. Multi-dispositivo con preferencia por métrica
- Nueva tabla `user_metric_device_preferences` (user_id, metric, device_id, priority) + grants/RLS.
- Hook `useMetricDevicePreferences` (get/set).
- Componente `MetricDeviceRouter` en `/dispositivos` pestaña **Preferencias**: por cada métrica (FC, pasos, sueño, SpO₂) selector con dispositivos emparejados (desde `useBlePairings` + `patient_ble_pairings` + `user_device_verifications`).
- `useUnifiedReadings` respeta la preferencia: si hay duplicados en el mismo timestamp (±60s), se queda con el del dispositivo prioritario. Sin preferencia → comportamiento actual (unión).

## 5. Modo verificación extendida
- Botón "Verificación extendida" en `WearableConnectionTest`. Ejecuta 3 pruebas espaciadas: 5, 15 y 60 minutos (configurable). Persistente ante recarga vía `localStorage` (ejecuciones programadas + `Notification API` cuando esté permitido).
- Resumen final `ExtendedVerificationSummary`: matriz métrica × intervalo con primera aparición, cadencia estimada, gaps. Guardado como una serie de tests enlazados por `run_id` (columna nueva `run_id uuid` en `wearable_connection_tests`).

## Sección técnica

```text
src/
  hooks/
    useConnectionTestHistory.ts        (nuevo)
    useAutoRetrySync.ts                (nuevo)
    useMetricDevicePreferences.ts      (nuevo)
    useExtendedVerification.ts         (nuevo)
    useHealthDevices.ts                (extensión: onError → useAutoRetrySync)
    useUnifiedReadings.ts              (dedup respetando preferencias)
  components/health/
    WearableConnectionTest.tsx         (persiste cada corrida, botón PDF, botón extendida)
    WearableConnectionTestPdf.tsx      (nuevo)
    ConnectionTestHistoryList.tsx      (nuevo)
    AutoRetryStatusCard.tsx            (nuevo)
    MetricDeviceRouter.tsx             (nuevo)
    ExtendedVerificationSummary.tsx    (nuevo)
    SyncStatusCard.tsx                 (integra AutoRetryStatusCard)
  pages/DispositivosCompatibles.tsx    (pestañas: Catálogo · Probar · Historial · Preferencias)
```

Migración SQL (esquema resumido):

```sql
CREATE TABLE public.wearable_connection_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id uuid,                     -- agrupa verificación extendida
  tested_at timestamptz NOT NULL DEFAULT now(),
  platform text,                   -- ios|android|web
  availability boolean,
  overall_status text NOT NULL,    -- ok|partial|error
  duration_ms integer,
  trigger text,                    -- manual|auto_retry|extended
  notes text
);
CREATE TABLE public.wearable_connection_test_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.wearable_connection_tests(id) ON DELETE CASCADE,
  metric text NOT NULL,            -- heart_rate|steps|sleep|spo2
  status text NOT NULL,            -- ok|warn|error
  samples_count integer DEFAULT 0,
  last_value numeric,
  last_at timestamptz,
  error_code text,
  error_message text
);
CREATE TABLE public.user_metric_device_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL,
  device_id text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, metric, device_id)
);
-- GRANT SELECT,INSERT,UPDATE,DELETE ... TO authenticated; GRANT ALL ... TO service_role;
-- RLS: (user_id = auth.uid()) en todas; hija enlaza por test_id.
```

## Fuera de alcance
- No se toca la lógica de parseo BLE, ni el catálogo de dispositivos, ni los monitores clínicos.
- Sin reintentos server-side (todo client-side con `localStorage`), suficiente para Health Connect/HealthKit que corren en el dispositivo.

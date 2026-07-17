## Objetivo
Cuatro mejoras para el módulo BLE en el expediente del paciente.

## 1. Historial de dispositivos BLE emparejados por paciente
- Nueva tabla `patient_ble_pairings` (patient_id, device_name, model, external_uuid, service_type, paired_at, last_connected_at, last_status, last_error, unpaired_at) con RLS por paciente + roles clínicos.
- Al emparejar en `BlePairingWizard` y al ejecutar "Probar conexión" en `BleConnectPanel`, hacer upsert por (patient_id, external_uuid) actualizando `last_connected_at`, `last_status` (ok/error) y `last_error`.
- Nuevo componente `BlePairingHistoryPanel.tsx` en la pestaña BLE del expediente: tabla con modelo/ID, fecha emparejamiento, última conexión, estado (badge ok/error) y detalle de error expandible.

## 2. Configuración de timeouts y reintentos
- Nueva tabla `ble_test_settings` (user_id PK, scan_timeout_ms, read_timeout_ms, max_retries, retry_delay_ms) con defaults (8000/8000/2/1500).
- Hook `useBleTestSettings` con carga/guardado.
- `useBleConnectionTest` lee la config y aplica retries con backoff.
- `BlePairingWizard` respeta los mismos valores.
- Card "Ajustes BLE" en `NotificationPreferences` o nueva sección en `Profile` con sliders/inputs.

## 3. Registro de motivo y detalles del último error
- Reutilizar `last_error` en `patient_ble_pairings` + nueva tabla `ble_connection_errors` (patient_id, external_uuid, service_type, error_code, error_message, browser_ua, created_at) para historial completo.
- Insertar registro cada vez que `useBleConnectionTest` falla; guardar mensaje, causa (permisos/timeout/GATT), user agent.
- Mostrar en `BlePairingHistoryPanel` el último error con botón "Copiar detalles" para compartir con soporte/aseguradora.

## 4. CSV con filtros de fecha y estado de validación
- Refactor de `BleReportCSVButton` (o nuevo `BleReadingsCsvExportDialog`) para incluir:
  - Rango de fechas (from/to).
  - Multi-select de tipos de lectura (BP, SpO2, temp, glucosa, HR, actividad).
  - Multi-select de estado: pendiente / validada / rechazada / mitigada.
  - Columnas personalizables (ya existe).
- Query respeta filtros y arma CSV por paciente activo.
- Botón visible en pestaña BLE del expediente.

## Detalles técnicos
- Migración crea las 3 tablas con GRANTs (`authenticated`, `service_role`), triggers `update_updated_at_column`, RLS con `has_patient_access` para pairings/errores.
- `ble_test_settings` scoped a `auth.uid()`.
- Actualizar `src/lib/ble/index.ts` para aceptar `{ scanTimeoutMs, readTimeoutMs }` en helpers.
- No romper `BleConnectPanel` actual: los nuevos componentes se añaden como cards adicionales.

## Archivos principales
- Migración SQL (3 tablas + policies + grants).
- `src/hooks/useBleTestSettings.ts` (nuevo).
- `src/hooks/useBlePairings.ts` (nuevo).
- `src/hooks/useBleConnectionTest.ts` (actualizar retries/timeouts + logging).
- `src/components/ble/BlePairingHistoryPanel.tsx` (nuevo).
- `src/components/ble/BleTestSettingsCard.tsx` (nuevo).
- `src/components/ble/BleConnectPanel.tsx` (integrar historial + upsert on test).
- `src/components/ble/BlePairingWizard.tsx` (upsert pairing + respetar settings).
- `src/components/expediente/BleReadingsCsvExportDialog.tsx` (nuevo) o extender `BleReportCSVButton.tsx`.
- `src/components/expediente/PatientExpedienteTabs.tsx` (montar historial + CSV).
- `src/pages/Profile.tsx` (montar `BleTestSettingsCard`).

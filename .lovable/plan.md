
# Plan: Ampliación de módulo BLE + Notificaciones + PDF clínico

Se implementa en 5 bloques que comparten base (tabla `notifications` ya existente y `ble_known_devices` ya sembrada).

## 1. Notificaciones push (con fallback web)

- Usar la tabla `notifications` existente como fuente de verdad.
- Web fallback: `Notification API` + toast Sonner cuando la app esté abierta.
- Push nativo: `@capacitor/push-notifications` (registro de token FCM/APNs guardado en nueva tabla `user_push_tokens`).
- Edge function `notify-user` que:
  - Inserta fila en `notifications`.
  - Envía push a tokens del usuario si existen.
- Disparadores:
  - Trigger DB `on_bp_reading_reviewed` → cuando `requires_review` pasa de true→false, notifica al paciente.
  - Trigger DB `on_medical_alert_insert` → notifica alerta clínica activa.
- Hook `useNotifications` con badge en `BottomNav`/`AppSidebar` y panel `/notificaciones`.

## 2. Whitelist de dispositivos BLE (admin)

- Nueva página `/admin/ble-devices` (solo rol `admin`).
- CRUD sobre `ble_known_devices` (agregar, editar, marcar `blocked`, marcar `verified`).
- Filtros por marca, modelo, tipo de medición, estado.
- En perfil del usuario (`BleConnectPanel`), mostrar badge:
  - "Verificado" (verde) si el dispositivo está en whitelist verificado.
  - "No verificado" (amarillo).
  - "Bloqueado" (rojo) — impide iniciar sesión de medición.

## 3. PDF de lecturas BLE validadas por paciente

- Botón "Descargar PDF para aseguradora" en expediente del paciente.
- Edge function `generate-ble-report-pdf` con `pdf-lib` que compila:
  - Presión (validadas), Glucosa, SpO2, Temperatura, Frecuencia cardíaca.
  - Rango de fechas seleccionable.
  - Encabezado con datos del paciente + logo CareCentral.
  - Marca "Validado por profesional" en cada renglón.
- Descarga directa desde el navegador.

## 4. Flujo "pendiente de revisión" para SpO2, temperatura y actividad

- Agregar `requires_review boolean default false`, `reviewed_by uuid`, `reviewed_at timestamptz`, `review_notes text` en:
  - `spo2_readings`
  - `temperature_readings`
  - `activity_readings`
- Al insertar desde BLE con umbrales anormales (SpO2 < 92, temp > 38 o < 35, actividad = 0 prolongada), marcar `requires_review = true`.
- Nuevo panel unificado `PendingReviewsPanel` en `PatientExpedienteTabs` que muestra pendientes de las 4 tablas (BP, SpO2, temperatura, actividad) con acciones Validar/Descartar.
- Hook `useReviewReading` genérico por tipo.

## 5. Desvincular y limpiar por dispositivo BLE

- En `BleConnectPanel`, cada dispositivo tendrá acción "Desvincular y borrar datos":
  - Elimina lecturas donde `external_uuid = <device_id>` de las 5 tablas clínicas BLE.
  - Elimina fila de `user_ble_devices`.
  - Registra evento en `audit_logs`.
- Confirmación con diálogo destructivo.

## Detalles técnicos

- Migraciones (una sola) para: `user_push_tokens`, columnas de revisión en 3 tablas, triggers `on_bp_reading_reviewed` y `on_medical_alert_insert`, política RLS admin en `ble_known_devices` (update/delete).
- Edge functions nuevas: `notify-user`, `generate-ble-report-pdf`.
- Package: `@capacitor/push-notifications` (nativo), `pdf-lib` (edge).
- No se rompen APIs existentes; `useReviewBpReading` se refactoriza a `useReviewReading(kind)`.

## Orden de ejecución

1. Migración DB (todas las columnas, tabla, triggers, RLS).
2. Edge functions + secrets si aplican.
3. Hooks y librería (`ble`, `notifications`, `pdf`).
4. Páginas y paneles UI.
5. Verificación con typecheck y prueba manual del flujo revisar → notificación.

¿Confirmas para arrancar?

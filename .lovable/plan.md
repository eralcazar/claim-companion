# Plan: Mejoras UX y reporting para BLE

Cinco entregables enfocados en presentación/UX sobre el módulo BLE existente. No cambia la lógica clínica ni el esquema de reviews.

## 1. CSV de lecturas BLE de prueba por paciente

Reutilizar el patrón de `BleReportCSVButton.tsx`, pero enfocado a lecturas de **prueba/diagnóstico** (no clínicas validadas).

- Nueva utilidad `src/lib/exportBleTestCSV.ts`:
  - Recibe `patientId`, `dateRange`, `types[]`.
  - Consulta `blood_pressure_readings`, `spo2_readings`, `heart_rate_readings`, `temperature_readings` filtrando por `source = 'ble'`.
  - Une con `reading_reviews` para incluir `status` (validada / rechazada / mitigada / pendiente).
  - Columnas: `fecha`, `tipo`, `dispositivo`, `valor`, `unidad`, `estado_validacion`, `revisor`, `observaciones`.
- Nuevo componente `src/components/expediente/BleTestReportButton.tsx` con diálogo (rango de fechas + tipos), montado en `PatientExpedienteTabs.tsx` junto al botón CSV clínico existente.
- Permisos: paciente ve solo lo suyo; admin/medico/enfermero/broker según roles ya definidos.

## 2. Botón "Probar conexión"

En `BleConnectPanel.tsx`, junto a cada tipo de servicio:

- Botón **"Probar conexión"** que ejecuta:
  1. `navigator.bluetooth.requestDevice` con filtros del servicio.
  2. `gatt.connect()` + lectura de **una** notificación (timeout 8s).
  3. Desconecta inmediatamente.
- Muestra `Badge` de estado en línea: `Idle` → `Escaneando…` → `OK ✓ (RSSI/valor recibido)` o `Error: <mensaje>`.
- Hook `useBleConnectionTest()` con estado (`idle | scanning | reading | success | error`) y último resultado.

## 3. Guía de troubleshooting in-app

Componente `src/components/ble/BleTroubleshootingGuide.tsx`:

- Se renderiza dentro de `BleConnectPanel` cuando `useBleAvailability()` reporta error o cuando la prueba de conexión falla.
- Contenido por escenario detectado:
  - Navegador no compatible (iOS Safari, Firefox) → recomendar Chrome/Edge o app móvil.
  - Bluetooth apagado → pasos SO por SO.
  - Permisos denegados → cómo re-otorgarlos.
  - Dispositivo no aparece → modo emparejamiento, distancia, batería, cerrar app fabricante.
  - GATT error/timeout → reintentar, reset del dispositivo.
- Acordeón (`Accordion` de shadcn) con pasos numerados y CTA "Reintentar prueba".

## 4. Asistente paso a paso de emparejamiento

Nuevo `src/components/ble/BlePairingWizard.tsx` (Dialog multi-step):

1. **Selecciona tipo de dispositivo** (Tensiómetro / Oxímetro / Termómetro).
2. **Prepara el dispositivo** (instrucciones + imagen genérica: batería, modo pairing).
3. **Escanear y elegir** (usa Web Bluetooth device chooser).
4. **Conexión de prueba** (lee una muestra, muestra valor recibido).
5. **Confirmación** (nombre amigable + guardar en `user_ble_devices`; marca `verified` si el valor pasó rangos plausibles).

Se lanza desde `BleConnectPanel` (botón "Emparejar dispositivo con asistente") y desde el expediente en la pestaña BLE.

## 5. Catálogo de dispositivos compatibles

Nueva página `src/pages/DispositivosCompatibles.tsx` (ruta `/dispositivos`), enlazada desde el sidebar (sección Ayuda) y desde el wizard como "Ver dispositivos recomendados".

- Fuente: array estático en `src/lib/ble/compatibleDevices.ts` (no requiere tabla).
- Cada item: nombre, fabricante, tipo de lectura, servicio GATT, tier de precio, notas de compatibilidad, link externo.
- Ejemplos iniciales: Wellue O2Ring, Omron M7 Intelli IT, Viatom Checkme O2, Berry BM2000B, A&D UA-651BLE, termómetros con Health Thermometer Service.
- UI: grid de cards con filtro por tipo (SpO₂, BP, Temp, HR) y badge "Probado en CareCentral".

## Detalles técnicos

- Sin migraciones de BD — todo se apoya en tablas y hooks existentes (`useBleSession`, `useSavedBleDevices`, `user_ble_devices`, `*_readings`, `reading_reviews`).
- Reusar helpers de `src/lib/ble/index.ts` para parseo; añadir `testRead(serviceType)` que retorna la primera muestra parseada.
- Sin cambios en edge functions ni en MCP.
- Rutas nuevas registradas en `src/App.tsx`; entrada de sidebar en `src/components/AppSidebar.tsx`.

## Archivos nuevos
- `src/lib/exportBleTestCSV.ts`
- `src/lib/ble/compatibleDevices.ts`
- `src/components/expediente/BleTestReportButton.tsx`
- `src/components/ble/BleTroubleshootingGuide.tsx`
- `src/components/ble/BlePairingWizard.tsx`
- `src/hooks/useBleConnectionTest.ts`
- `src/pages/DispositivosCompatibles.tsx`

## Archivos modificados
- `src/components/ble/BleConnectPanel.tsx` — botón probar conexión + guía + CTA wizard.
- `src/components/expediente/PatientExpedienteTabs.tsx` — botón CSV de prueba + entrada al wizard.
- `src/lib/ble/index.ts` — helper `testRead()`.
- `src/App.tsx`, `src/components/AppSidebar.tsx` — ruta y enlace a catálogo.

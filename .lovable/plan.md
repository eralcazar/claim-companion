# BLE Directo — Implementación completa v1

Arranco con el alcance **mínimo enfocado + consultorio + fallback OCR iOS**, con validación humana para presión y glucosa. Cubre todos los puntos discutidos en una sola entrega.

## Alcance

- Dispositivos v1: **tensiómetro** y **oxímetro de pulso** (perfiles GATT estándar 0x1810 y 0x1822).
- Modo paciente (auto-medición) y **modo consultorio** (médico/enfermero mide al paciente activo).
- Whitelist de dispositivos verificados vs genéricos (badge visual).
- Lecturas de presión marcadas como **"pendiente de revisión"**; no disparan alertas hasta validarse. Oxímetro entra directo.
- Reconexión automática usando dispositivos guardados por usuario.
- Fallback iOS Safari: CTA "Instalar app" + botón "Capturar con foto (OCR)".

## Cambios

### Base de datos
- Nueva tabla `user_ble_devices` (user_id, device_id, name, service_uuid, is_whitelisted, last_connected_at). RLS por dueño + GRANTs estándar.
- Añadir columna `requires_review boolean default false` y `reviewed_at`, `reviewed_by` a `blood_pressure_readings` y `glucose_readings`.
- Whitelist semilla en tabla nueva `ble_known_devices` (name_pattern, vendor, service_uuid, notes) — lectura pública para autenticados.

### Código
- `src/lib/ble/` — wrapper unificado (Web Bluetooth + `@capacitor-community/bluetooth-le`), parsers GATT para Blood Pressure Measurement (0x2A35) y PLX Continuous Measurement (0x2A5F).
- `src/hooks/useBleDevices.ts` — escanear, conectar, suscribir notificaciones, guardar lecturas, gestionar dispositivos guardados.
- `src/components/ble/BleConnectPanel.tsx` — UI en `/perfil` con lista de dispositivos guardados, badge whitelist, botón desvincular.
- `src/components/consultorio/BleAssistedMeasurement.tsx` — panel embebido en `Consultorio.tsx` para medir al paciente activo (asocia lectura a `patient_id` del contexto).
- Vista **"Pendientes de revisión"** en el expediente del paciente: lista lecturas con `requires_review=true`, botón Validar/Descartar.
- Fallback OCR iOS: reutiliza el pipeline existente de OCR (mismos costos de cuota) para foto del display del dispositivo.

### Instalación
- `bun add @capacitor-community/bluetooth-le` y sync nativo.

## Detalles técnicos

```text
Flujo lectura BP:
[Device] --GATT indicate 0x2A35--> [Parser IEEE-11073 SFLOAT]
       --> upsert blood_pressure_readings (source='ble', device_name, external_uuid, requires_review=true)
       --> UI "Pendiente de revisión" al médico
       --> Validar => requires_review=false, dispara alertas si aplica
```

- `external_uuid` = hash(device_id + timestamp del measurement) para idempotencia.
- Web Bluetooth requiere HTTPS + gesto de usuario; se llama desde onClick.
- iOS Safari: `navigator.bluetooth` no existe → mostrar fallback.

## No incluido en v1

- Termómetro, glucosa BLE, báscula, HR standalone (fase 2 cuando validemos pipeline).
- Emparejamiento BLE en background (requiere nativo puro).

## Objetivo

Añadir un botón **"Solicitar integración de un modelo"** en el catálogo de dispositivos para que el usuario pida a CareCentral evaluar/integrar un modelo que **no está listado** (o cualquier modelo del que quiera integración directa BLE, no solo verificación).

Se distingue del flujo existente "Solicitar prueba" (que aplica a un dispositivo ya presente en el catálogo).

## Ubicación del botón

En `src/pages/DispositivosCompatibles.tsx`, en el header de la página (junto al título del catálogo), botón outline con ícono `Plus`: **"Solicitar integración de un modelo"**. Abre un diálogo modal.

## Diálogo nuevo

Nuevo componente `src/components/ble/RequestDeviceIntegrationDialog.tsx`:

Campos del formulario:
- **Marca** (obligatorio, texto).
- **Modelo** (obligatorio, texto).
- **Tipo de dispositivo** (select: oxímetro, tensiómetro, termómetro, smartband, smartwatch, anillo, báscula, otro).
- **Métricas de interés** (multi-check: SpO₂, presión, temperatura, FC, actividad, sueño, peso).
- **Región/país** (texto, opcional).
- **App oficial del fabricante** (texto, opcional).
- **Enlace del producto** (URL, opcional).
- **Motivo / caso de uso** (textarea, opcional).

Al enviar: `insert` a `public.device_test_requests` con:
- `device_id = "integration-request:<slug(marca-modelo)>"` para diferenciarlo de solicitudes ligadas al catálogo.
- `device_name = "<marca> <modelo>"`.
- `region`, `app_version = <app oficial>`.
- `note = JSON.stringify({ kind: "integration_request", deviceType, readings, url, reason })` — reutiliza el campo `note` para conservar los extras sin migración.
- `status = 'pending'`.

Toast de éxito y cierre. Errores mostrados inline.

## Panel admin

En `src/pages/admin/DeviceTestRequestsAdmin.tsx` (si existe) parsear `note` como JSON cuando `device_id` empieza con `integration-request:` y mostrar los campos extra (tipo, métricas, enlace, motivo) en la tarjeta. Sin cambios de flujo de resolución.

## Fuera de alcance

- No se agrega tabla nueva ni migración (se reutiliza `device_test_requests`).
- No se toca el flujo existente "Solicitar prueba" del `DeviceDetailSheet`.
- No se envían emails/notificaciones al equipo (queda para otra iteración).

## Archivos

- `src/components/ble/RequestDeviceIntegrationDialog.tsx` — nuevo.
- `src/pages/DispositivosCompatibles.tsx` — botón + estado del diálogo en el header.
- `src/pages/admin/DeviceTestRequestsAdmin.tsx` (si existe) — render enriquecido para solicitudes de integración.

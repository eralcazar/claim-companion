# Catálogo ampliado de dispositivos y wearables

Amplío el módulo `/dispositivos-ble` para cubrir no solo BLE directo sino también smartbands/relojes vía Health Connect/HealthKit, con búsqueda, filtros, fichas detalladas y verificación guardada por usuario.

## 1. Expansión del catálogo (`src/lib/ble/compatibleDevices.ts`)

Agrego nuevos campos al tipo `CompatibleDevice`:
- `deviceType`: `oximeter | bp_monitor | thermometer | smartband | smartwatch | ring | scale`
- `connectionMethod`: `ble_direct | health_connect | healthkit | vendor_app_bridge | not_compatible`
- `compatibilityStatus`: `verified | probable | community | incompatible`
- `pairingSteps`: `string[]` (instrucciones paso a paso)
- `syncSource`: string explicando qué app/API usar
- `firmwareNote?`: string opcional

Amplío el catálogo (~20 modelos) incluyendo:
- **BLE directo (clínicos):** Wellue O2Ring, Omron M7, A&D UA-651BLE, Beurer FT 95, Berry BM2000B, Checkme O2.
- **Puente Health Connect/HealthKit:** Xiaomi Smart Band 8/9/10, Haylou RS4/Solar Plus, Amazfit Bip 5/GTS 4, Huawei Band 9, Apple Watch SE, Fitbit Charge 6, Google Pixel Watch.
- **Genéricos incompatibles con advertencia:** Colmi P8, Y68/D20 (marcados como `not_compatible` con explicación clara).

## 2. Renombrar y renovar la página → `src/pages/DispositivosCompatibles.tsx`

Cambio el título a "Dispositivos y wearables compatibles". Nuevas secciones:

- **Barra de búsqueda** por nombre/marca (input con debounce).
- **Filtros combinables** (chips): Marca, Tipo de dispositivo, Método de conexión, Estado de compatibilidad, Tipo de medición.
- **Grid de tarjetas** con badges de estado (verde/ámbar/rojo) y método de conexión visible.
- Cada tarjeta abre un **Sheet/Dialog con ficha completa** (nuevo componente).

## 3. Nuevo componente `src/components/ble/DeviceDetailSheet.tsx`

Ficha con:
- Cabecera: marca, modelo, badges de tipo, conexión, estado.
- **Instrucciones de emparejamiento** paso a paso (numeradas) según `connectionMethod`.
- **Fuente de sincronización recomendada** (Web Bluetooth vs Health Connect vs HealthKit vs App del fabricante).
- Botón "Probar conexión ahora" (redirige al wizard existente si es BLE directo, o abre el panel de Health Devices si es puente).
- Sección **"Mi verificación"** con formulario y lista de intentos previos del usuario (ver §5).

## 4. Nueva tabla `user_device_verifications` (migración)

Guarda el resultado que reporta el usuario por modelo:

```sql
CREATE TABLE public.user_device_verifications (
  id uuid PK default gen_random_uuid(),
  user_id uuid NOT NULL,        -- auth.uid()
  device_id text NOT NULL,      -- ej. "wellue-o2ring" (id del catálogo)
  firmware text,
  app_version text,
  status text NOT NULL,         -- 'success' | 'partial' | 'failed'
  connection_method text,       -- copiado del catálogo al momento de la prueba
  notes text,
  tested_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_device_verifications TO authenticated;
GRANT ALL ON public.user_device_verifications TO service_role;
ALTER TABLE ... ENABLE RLS;
-- Policies: cada usuario ve/edita solo sus filas; admin ve todo.
```

Índice en `(user_id, device_id, tested_at desc)`.

## 5. Formulario y hook de verificación

- `src/hooks/useDeviceVerifications.ts`: react-query hooks `list(deviceId)`, `create()`, `remove(id)`.
- `src/components/ble/DeviceVerificationForm.tsx`: campos firmware, versión app, estado (select success/partial/failed), notas. Se monta dentro del `DeviceDetailSheet`.
- Muestra listado cronológico con badge de estado y opción de borrar.

## 6. Contadores agregados

En la vista principal, arriba de la grilla: chip "Verificados por la comunidad: N" (count distinct `device_id` con `status='success'` en `user_device_verifications`, consultado vía RPC o vista pública agregada). *(Opcional; sin PII expuesta.)*

## Detalles técnicos

- Toda la lógica de filtros/búsqueda es cliente-side sobre el arreglo estático (el catálogo cabe fácilmente en memoria).
- El `DeviceDetailSheet` usa `Sheet` de shadcn (mobile-friendly, ya presente en el proyecto).
- El botón "Probar conexión" reutiliza `BlePairingWizard` existente para BLE directo y `HealthDevicesPanel` para puentes.
- No se toca `HealthDevicesPanel` ni el wizard actual; solo se enlazan.
- Sin cambios en las tablas de lecturas ni en el flujo de sincronización.

## Archivos afectados

- `src/lib/ble/compatibleDevices.ts` — ampliar tipos + ~15 modelos nuevos.
- `src/pages/DispositivosCompatibles.tsx` — reescritura con búsqueda/filtros/sheet.
- `src/components/ble/DeviceDetailSheet.tsx` — nuevo.
- `src/components/ble/DeviceVerificationForm.tsx` — nuevo.
- `src/hooks/useDeviceVerifications.ts` — nuevo.
- Migración: crear `user_device_verifications` con RLS + GRANTs.

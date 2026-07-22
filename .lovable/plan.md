## Alcance

Ampliar el flujo de `/domicilio` con: mapa ampliado, autocompletado, áreas de cobertura (con mantenimiento), precisión GPS, manejo de permisos, notificaciones + aceptación por médico y verificación de rol.

## 1. Mapa ampliado dentro de la solicitud

- Al abrir una tarjeta de solicitud (nuevo estado `openId`), mostrar un `Dialog` con mapa Leaflet a pantalla grande, pin arrastrable y HUD con lat/lng + dirección actual.
- Botón **"Guardar ubicación"** que dispara `useUpdateHomeVisit` con `{ lat, lng, direccion }` y `toast` de confirmación. Sólo habilitado si el rol permite editar (paciente dueño o médico asignado).
- Reutilizar `AddressPicker` extrayendo el `MapContainer` a un subcomponente `AddressMap` reutilizable entre picker chico y vista ampliada.

## 2. Autocompletado del buscador

- Reemplazar el botón "Buscar" por un `Command`/`Popover` con debounce 300 ms que llama a Nominatim `/search?q=…&limit=5&countrycodes=mx&addressdetails=1`.
- Cada sugerencia muestra "calle y número, colonia, ciudad" (`address.road`, `house_number`, `suburb`, `city`).
- Al elegir → setea `direccion`, `lat`, `lng` y `location_source = 'search'`.

## 3. Áreas de cobertura + mantenimiento

Nueva tabla `coverage_areas` (nombre, centro lat/lng, radio en metros, activa, `owner_id` = user_id del médico o `null` para áreas globales del admin).

- RLS: lectura autenticada; escritura sólo para el `owner_id` o admin.
- Página nueva **`/domicilio/cobertura`** (link visible sólo para roles `medico`/`admin`) con:
  - Lista de áreas, mapa con círculos, formulario para crear/editar (nombre, radio, click en mapa para fijar centro).
- En `AddressPicker`, dibujar los `Circle` de las áreas activas y mostrar un badge:
  - Verde "Dentro del área de servicio" si la dirección cae dentro de al menos un círculo (cálculo por Haversine, ya existe `src/lib/geo/haversine.ts`).
  - Ámbar "Fuera del área — pueden aplicar restricciones" si no.
- Guardar en `home_visit_requests.in_coverage boolean` para consultas del médico.

## 4. Precisión GPS + ubicación aproximada

- Al llamar `getCurrentPosition` guardar `pos.coords.accuracy` y mostrar chip `± N m` en el picker.
- Si `accuracy > 100 m` o el usuario deniega alta precisión: botón **"Usar ubicación aproximada"** que llama con `enableHighAccuracy: false` y marca `location_source = 'approx'`.
- Guardar `accuracy_m` y `location_source` en la solicitud.

## 5. Permisos de ubicación

- Consultar `navigator.permissions.query({ name: 'geolocation' })` al montar el picker.
- Estados:
  - `granted` → botón normal.
  - `prompt` → botón normal + tooltip "Se te pedirá permiso".
  - `denied` → alerta clara con pasos por navegador (Chrome/Safari/Firefox) y botón deshabilitado; **la solicitud sigue enviable** capturando la dirección manualmente (o vía buscador).
- Errores de `getCurrentPosition` (`PERMISSION_DENIED`, `TIMEOUT`, `POSITION_UNAVAILABLE`) mapeados a mensajes en español.

## 6. Notificaciones + aceptación por médico

- Añadir columnas a `home_visit_requests`: `requested_doctor_id uuid` (médico preferido opcional), `accepted_at timestamptz`.
- En el formulario de solicitud, agregar `Select` **"Médico (opcional)"** poblado con `useMedicoUsers()` (catálogo existente) para asignación dirigida; si se deja vacío, la solicitud queda abierta a cualquier médico.
- Trigger de DB `AFTER INSERT ON home_visit_requests` que inserta filas en `notifications`:
  - Si `requested_doctor_id` no es null → notificar sólo a ese médico.
  - Si es null → notificar a todos los usuarios con rol `medico` y `admin`.
  - `category = 'home_visit'`, `link = '/domicilio'`, título y cuerpo con motivo + urgencia.
- Trigger `AFTER UPDATE` cuando `estado` cambia a `aceptada` → notificar al paciente ("Tu solicitud fue aceptada por Dr. X"). También setea `accepted_at = now()` y `doctor_id = auth.uid()` si viene NULL.
- Botón **"Aceptar"** en la bandeja profesional (además del selector de estado) que hace `update({ estado: 'aceptada' })`. La solicitud sale de la bandeja de pendientes del resto de médicos vía política de lectura filtrada (`doctor_id IS NULL OR doctor_id = auth.uid()` para estados no finales).

## 7. Verificación de rol para "Solicitar"

- Ya se respeta `active_role` en `Domicilio.tsx`; agregar además:
  - Si el usuario no tiene rol `paciente` mostrar `Alert` claro: "Sólo pacientes pueden crear solicitudes. Cambia de rol en tu perfil o solicita el rol de paciente."
  - Si tiene rol paciente pero está en modo profesional, mostrar hint junto al toggle: "Cambia a **Mis solicitudes** para crear una nueva."
- El botón "Solicitar" ya sólo se pinta en `mode === 'paciente'`; añadimos un `disabled` con tooltip cuando falte `active_role='paciente'` en `profiles` para dejar el estado consistente.

## Detalles técnicos

**Migraciones (una sola):**

```sql
ALTER TABLE public.home_visit_requests
  ADD COLUMN accuracy_m numeric,
  ADD COLUMN location_source text,          -- 'gps' | 'approx' | 'search' | 'manual' | 'map'
  ADD COLUMN in_coverage boolean,
  ADD COLUMN requested_doctor_id uuid,
  ADD COLUMN accepted_at timestamptz;

CREATE TABLE public.coverage_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,                            -- null = área global (admin)
  nombre text NOT NULL,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  radius_m integer NOT NULL CHECK (radius_m > 0),
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coverage_areas TO authenticated;
GRANT ALL ON public.coverage_areas TO service_role;
ALTER TABLE public.coverage_areas ENABLE ROW LEVEL SECURITY;
-- Lectura: cualquier autenticado. Escritura: owner o admin.
```

Trigger de notificaciones en el mismo migration + `update_updated_at_column` reutilizado.

**Archivos frontend nuevos / modificados:**

- `src/components/domicilio/AddressPicker.tsx` — autocompletado, precisión, permisos, círculos de cobertura.
- `src/components/domicilio/AddressMap.tsx` (extraído) — mapa reutilizable.
- `src/components/domicilio/VisitDetailDialog.tsx` — vista ampliada con edición de pin.
- `src/components/domicilio/HomeVisitsPanel.tsx` — abrir detalle, botón "Aceptar", selector de médico preferido en el formulario, mensaje de rol.
- `src/pages/CoverageAreas.tsx` + ruta `/domicilio/cobertura` en `src/App.tsx` y entrada de sidebar sólo para `medico`/`admin`.
- `src/hooks/useCoverageAreas.ts` — CRUD con React Query.
- `src/hooks/useHomeVisits.ts` — mutaciones `accept` y aceptación de campos nuevos.
- `src/lib/geo/coverage.ts` — helper `isInsideAnyArea(lat, lng, areas)`.

**Sin cambios de negocio en:** módulos ajenos a `/domicilio`. No se toca `AuthContext`, roles, ni el catálogo de médicos (sólo se consume vía hook existente).

## Fuera de alcance

- Ruteo/ETA del médico hacia el paciente (mapa en tiempo real).
- Cobros / precios variables por zona.
- Push mobile nativo (se usa la tabla `notifications` y el sistema existente).

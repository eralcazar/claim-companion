## Objetivo

Enriquecer el flujo de médico a domicilio con: rechazo con motivo, timeline de estados, sugerencia de médicos antes de solicitar, y transiciones "en camino" / "llegó" con notificaciones.

## Cambios de base de datos

**Migración 1 — Rechazo + timeline**
- `home_visit_requests`: nuevas columnas
  - `motivo_rechazo text`
  - `rechazado_at timestamptz`
  - `en_camino_at timestamptz`
  - `llegado_at timestamptz`
- Nueva tabla `home_visit_events` (timeline append-only)
  - `visit_id uuid → home_visit_requests(id) on delete cascade`
  - `actor_id uuid` (auth.uid del que dispara)
  - `event text` (`created|accepted|rejected|en_route|arrived|completed|cancelled|updated`)
  - `metadata jsonb` (motivo, notas)
  - `created_at timestamptz default now()`
  - GRANT + RLS: SELECT para paciente dueño, médico asignado, admin. INSERT vía trigger (bloqueado directo).
- Trigger `home_visit_requests_log_events` (AFTER INSERT/UPDATE): inserta filas en `home_visit_events` detectando cambios de `estado` y campos clave.
- Extender trigger de notificaciones existente:
  - `rechazada` → notifica al paciente con `motivo_rechazo`.
  - `en_camino` → notifica "Tu médico va en camino".
  - `llegada` (nuevo estado) → notifica "Tu médico llegó".
- Añadir estado `rechazada` y `llegada` a la lista permitida (`ESTADOS`).

## Cambios de frontend

### Hooks
- `useHomeVisits.ts`
  - `useVisitEvents(visitId)` → lee `home_visit_events` ordenado asc.
  - `useRejectHomeVisit()` → update `estado='rechazada'`, `motivo_rechazo`, `rechazado_at`.
  - `useMarkEnRoute()` / `useMarkArrived()` → transiciones dedicadas.
- `useDoctorSuggestions.ts` (nuevo)
  - Input: `{ lat, lng, especialidad? }`.
  - Combina `useMedicoUsers` + `coverage_areas` activas + `professional_availability` (si existe hoy) → devuelve médicos con badge "en cobertura" y "disponible hoy", orden por distancia al centro de cobertura.

### Componentes
- `RejectVisitDialog.tsx` (nuevo): select de motivos comunes (fuera de cobertura, sin disponibilidad, urgencia no compatible, otro) + textarea, botón "Rechazar".
- `VisitTimeline.tsx` (nuevo): lista vertical con icono por evento, actor (nombre desde `profiles`), fecha relativa (`date-fns`).
- `SuggestedDoctorsList.tsx` (nuevo): tarjetas seleccionables dentro del `RequestForm`, se activa cuando el paciente ya fijó dirección con lat/lng. Reemplaza al `Select` actual (o coexiste como "ver sugerencias").
- `HomeVisitsPanel.tsx`:
  - Médico: botones **En camino** (si `aceptada`), **Llegó** (si `en_camino`), **Rechazar** (si `pendiente`) además del `Select` de estado.
  - Muestra `motivo_rechazo` cuando existe.
  - Botón "Ver historial" abre `VisitDetailDialog` en tab Timeline.
- `VisitDetailDialog.tsx`: nuevos tabs `Mapa | Timeline`.

### Notificaciones cliente
- `useNotifications.ts` reconoce nuevos títulos ("🚗 …en camino", "📍 …llegó", "❌ Solicitud rechazada") para toast con acción "Ver solicitud" que navega a `/domicilio`.

## Detalles técnicos

- Los estados válidos quedan: `pendiente, aceptada, rechazada, en_camino, llegada, completada, cancelada`.
- El trigger de eventos usa `TG_OP` y compara `OLD.estado`/`NEW.estado` para clasificar. `created` se registra en AFTER INSERT.
- Sugerencias de médicos: si no hay `professional_availability` para hoy, se cae de vuelta a mostrar todos con badge "sin agenda publicada".
- Distancia paciente↔centro de área se calcula con `haversine` ya existente en `src/lib/geo/haversine.ts`.
- El paciente puede rechazar (cancelar) su propia solicitud vía botón separado ya existente; el rechazo con motivo es sólo para médico/admin.

## Alcance fuera de este plan
- Chat en vivo paciente-médico.
- ETA en tiempo real por GPS del médico.

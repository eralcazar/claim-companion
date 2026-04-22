

## Objetivo

Agregar a cada ítem de receta un botón **"Tomando"** que:

1. Registra automáticamente el medicamento en la sección **Medicamentos** del paciente (con fecha/hora de inicio, dosis, duración).
2. Genera **recordatorios programados** (notificaciones tipo pop-up + sonido) según la periodicidad indicada en la receta (cada 4h, 6h, 8h, 12h, etc.).
3. Permite "Detener toma" para dar de baja el seguimiento.

## Arquitectura

### 1. Migración SQL

**Tabla nueva `public.medication_schedule`** (registro maestro de tomas activas):
- `id uuid pk`
- `user_id uuid not null` (paciente)
- `medication_id uuid not null` → FK a `medications.id` (cascade)
- `receta_item_id uuid` (opcional, link a `receta_items.id` para evitar duplicados)
- `started_at timestamptz not null default now()`
- `next_dose_at timestamptz not null` (próxima dosis programada)
- `interval_hours numeric not null` (intervalo entre dosis)
- `ends_at timestamptz` (calculado: `started_at + dias_a_tomar * 24h`)
- `active boolean not null default true`
- `last_dose_at timestamptz`
- `created_at`, `updated_at`

RLS: paciente gestiona los suyos, médico ve los de sus pacientes, admin todo. Índice en `(active, next_dose_at)`.

**Extender enum `medication_frequency`** con: `cada_4_horas`, `cada_6_horas`, `cada_48_horas`, `personalizado`. Agregar columna `frequency_hours numeric` a `medications` para personalizado.

**Agregar columna `medications.receta_item_id uuid` nullable** para trazabilidad y evitar duplicados al pulsar "Tomando" dos veces.

**Habilitar extensiones** `pg_cron` y `pg_net` (si no están).

### 2. Edge Function `send-medication-reminders`

Nueva function en `supabase/functions/send-medication-reminders/index.ts`:
- Service role client.
- `select * from medication_schedule where active = true and next_dose_at <= now() and (ends_at is null or ends_at > now())`.
- Por cada fila:
  - `insert into notifications`: `title = "💊 Hora de tomar {nombre}"`, `body = "Dosis: {dosage}. Próxima toma en {interval_hours}h"`, `link = "/medicamentos"`.
  - `update medication_schedule set last_dose_at = now(), next_dose_at = now() + interval_hours * interval '1 hour'`.
  - Si `next_dose_at > ends_at`: marcar `active = false` y desactivar `medications.active = false`.
- Para programaciones expiradas (`ends_at <= now()`): desactivar.
- Devuelve `{ checked, sent, completed }`.

### 3. Cron job

Insertar via insert tool (no migración, lleva URL+anon key específicos del proyecto):
```sql
select cron.schedule(
  'medication-reminders-every-5min',
  '*/5 * * * *',
  $$ select net.http_post(
    url := 'https://zspetfkvdnhdbtcdwgry.supabase.co/functions/v1/send-medication-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon>"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);
```

Granularidad: cada 5 min (suficiente para tomas ≥ 4h; las notificaciones llegan con tolerancia de 5 min).

### 4. UI – Botón "Tomando" en `RecetaCard.tsx`

Por cada `item`:
- Si **no** está siendo tomado → botón **"Tomando"** (variante `outline`, ícono `Pill` + "Comenzar"). Solo visible si `receta.patient_id === user.id` (el paciente es quien marca su toma) **o** si el médico/admin lo activan en nombre del paciente.
- Si ya está activo → botón **"Detener"** (variante `secondary`, ícono `Square`) + texto pequeño "Próxima: {hh:mm}".

**Click en "Tomando"** ejecuta `useStartTakingMedication(item, receta)`:
1. Mapea `item.frecuencia` → `medication_frequency` enum + `frequency_hours`:
   - `cada_4h` → `cada_4_horas`, hours=4
   - `cada_6h` → `cada_6_horas`, hours=6
   - `cada_8h` → `cada_8_horas`, hours=8
   - `cada_12h` → `cada_12_horas`, hours=12
   - `cada_24h` → `cada_24_horas`, hours=24
   - `cada_48h` → `cada_48_horas`, hours=48
   - `semanal` → `semanal`, hours=168
   - `otro` → `personalizado`, hours=`item.frecuencia_horas`
2. `upsert` en `medications` (por `receta_item_id`) con `name=medicamento_nombre`, `dosage="{dosis}{unidad_dosis}"`, `frequency`, `frequency_hours`, `start_date=today`, `end_date=today + dias_a_tomar`.
3. `insert` en `medication_schedule`: `started_at=now()`, `next_dose_at=now()+interval_hours h`, `ends_at=now()+dias_a_tomar*24h` (o null si sin duración), `interval_hours`.
4. Toast "Recordatorios activados — primera notificación en {N}h".

### 5. Hook `useMedicationSchedule(items)`

Hook que consulta `medication_schedule` para los `receta_item_id` recibidos, devuelve `Map<receta_item_id, scheduleRow>` para que la UI sepa qué ítem ya está activo.

### 6. UI – Sonido y pop-up de notificación

`src/hooks/useNotifications.ts` ya hace toast en realtime. Añadimos:
- Detección de notificaciones cuyo `title` empieza con "💊" → tocar `Audio` corto (un beep wav embebido en `public/notification.mp3` o usar Web Audio API con un oscilador para evitar asset).
- `toast.warning(...)` con `duration: 30000` y action button "Marcar tomada" que llama `markRead`.
- Solicitar permiso de `Notification` API en login y disparar `new Notification(title, {body, icon, requireInteraction: true})` cuando la pestaña no está activa, además del toast.

Implementación: extender `useNotifications` para que en el handler de realtime:
```ts
const isMedReminder = n.title.startsWith("💊");
if (isMedReminder) {
  playBeep();                                  // Web Audio oscillator
  if (document.hidden && Notification.permission === "granted") {
    new Notification(n.title, { body: n.body, requireInteraction: true });
  }
  toast(n.title, { description: n.body, duration: 30000, important: true });
} else {
  toast(n.title, { description: n.body });
}
```

`playBeep()`: helper en `src/lib/sound.ts` que crea un `AudioContext` + oscillator (440Hz × 200ms × 2 pulsos) — no requiere asset.

Solicitud de permiso: en `AuthContext` o `App.tsx`, después del login, si `Notification.permission === "default"` llamar `Notification.requestPermission()`.

### 7. Página `Medicamentos`

Mostrar también `medication_schedule` activos: agregar badge "🔔 Recordatorio activo · próxima {hh:mm}" en cada `medications` que tenga schedule activo. Botón "Detener recordatorios" desactiva el schedule (sin borrar el medicamento).

## Archivos

**Creados:**
- Migración SQL: `medication_schedule` table + RLS + enum extension + `frequency_hours` + `receta_item_id` + extensiones `pg_cron`/`pg_net`.
- `supabase/functions/send-medication-reminders/index.ts`
- `src/hooks/useMedicationSchedule.ts`
- `src/lib/sound.ts` (beep via Web Audio API)
- Cron job vía insert tool (URL+anon hardcoded por seguridad).

**Modificados:**
- `src/components/recetas/RecetaCard.tsx` — botón "Tomando"/"Detener" por ítem + estado de schedule.
- `src/hooks/useNotifications.ts` — sonido + Notification API para reminders 💊.
- `src/contexts/AuthContext.tsx` — pedir permiso de Notification al login.
- `src/pages/Medications.tsx` — mostrar badge de recordatorio activo + botón detener.

## Resultado esperado

Paciente abre `/recetas` → ve receta con 3 medicamentos → click **"Tomando"** en "Paracetamol 500mg c/8h × 5 días" → toast "Recordatorios activados, próxima toma en 8h" → el medicamento aparece automáticamente en `/medicamentos` como activo con badge "🔔 Próxima 18:30" → cada 8h durante 5 días el paciente recibe pop-up + sonido + notificación del navegador "💊 Hora de tomar Paracetamol — Dosis: 500mg" → al cumplirse los 5 días, el schedule se desactiva solo. Botón "Detener" cancela los recordatorios sin borrar el historial del medicamento.


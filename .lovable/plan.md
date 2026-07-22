
## 1. Recordatorios del plan semanal (calendario + notificaciones)

Objetivo: cuando el paciente tenga un plan semanal activo, cada sesión programada aparezca en el calendario, dispare una notificación in-app previa y (si el usuario conectó Google Calendar) se sincronice como evento.

Cambios de datos:
- Nueva tabla `workout_plan_reminders` (plan_id, patient_id, weekday 0–6, hour, minutes_before, channels JSONB `{"in_app":true,"push":true,"gcal":false}`, active, created_at). GRANT + RLS por `auth.uid()=patient_id`.
- Nueva tabla `workout_sessions_scheduled` (id, plan_id, patient_id, scheduled_at, target_type, target_reference, status `pending|done|skipped|adjusted`, session_log_id nullable, notes). GRANT + RLS. Índice por (patient_id, scheduled_at).

Backend:
- Cron job `pg_cron` que cada 15 min invoca la edge function `send-workout-reminders` (similar a `send-bp-reminders`), la cual:
  - Busca `workout_sessions_scheduled` cuyo `scheduled_at - minutes_before` cae en la ventana.
  - Inserta `notifications` (kind `workout_reminder`) → llega por realtime al hook `usePushNotifications`.
  - Si `channels.gcal=true` y hay `user_google_tokens`, crea/actualiza evento en Google Calendar (usa el helper existente de `google_calendar_events`).
- Edge function `workout-plan-materialize` (llamada desde la UI al guardar plan): genera 4 semanas de `workout_sessions_scheduled` a partir del plan y de `workout_plan_reminders`.

Frontend:
- En `EjerciciosPlan.tsx`, sección "Recordatorios": editor de día/hora/canales + botón "Materializar próximas 4 semanas".
- `TrainingCalendar.tsx` pinta las scheduled como marcadores `pending` (color distinto de `done`).
- Al registrar una sesión desde `RegisterWorkoutDialog`, si existe una scheduled del mismo día se enlaza (`session_log_id`) y pasa a `done`.

## 2. Ajustes automáticos del Coach IA al registrar sesión

- En `useCreateSessionLog` (hook), tras insertar la sesión: invocar `ai-exercise-coach` en modo nuevo `progression_adjust` con { last_session, plan_id, next_scheduled }. La función devuelve `{ suggestions: [{ scheduled_id, new_target_reps, new_target_weight, rationale }], notes }`.
- Se actualiza `workout_sessions_scheduled` marcándola `adjusted` y guarda la sugerencia en `notes`. También inserta una `notification` "Coach IA ajustó tu próxima sesión".
- UI: en el detalle del calendario y en la card post-registro, mostrar `CoachAdjustmentBanner.tsx` con las sugerencias (aceptar / rechazar). Rechazar restaura el target original.

## 3. Importador CSV/JSON con mapeo de columnas y reporte de errores

Rediseño de `EjerciciosImportar.tsx` como wizard de 3 pasos:

1. **Cargar archivo**: acepta CSV (Papa Parse) o JSON. Detecta encoding, muestra preview de 20 filas.
2. **Mapeo de columnas**: matriz `campo_destino → columna_origen` con sugerencias fuzzy (nombre, ejercicio, fecha, sets, reps, peso_kg, rpe, descanso_seg, molestias, ambiente). Guarda el mapeo en `localStorage` para reusar.
3. **Validación y confirmación**: pasa cada fila por un esquema Zod. Se muestra un `ImportReport` con:
   - Filas OK (contador + preview).
   - Filas rechazadas (fila #, columnas problemáticas, motivo). Cada fila editable inline; al corregir se re-valida.
   - Botón "Descargar errores CSV" para trabajar offline.
   - Botón "Importar N filas válidas" (upsert idempotente por `(patient_id, fecha, exercise_key)`).

Cambios de datos:
- Ampliar `workout_import_batches` con: `rows_total`, `rows_ok`, `rows_failed`, `errors_json JSONB`, `column_map JSONB`. Migración aditiva.

Frontend nuevo:
- `src/components/ejercicios/import/ImportWizard.tsx`
- `src/components/ejercicios/import/ColumnMapper.tsx`
- `src/components/ejercicios/import/ImportReport.tsx`
- `src/lib/ejercicios/importSchema.ts` (Zod + normalizadores de fecha/peso).

## 4. Panel de progreso por ejercicio

En `EjercicioDetalle.tsx` (por `exercise_key`):

- Selector de rango: 30 / 90 / 180 / 365 días o custom.
- Gráficas Recharts:
  - **Volumen total** (sets × reps × peso) por sesión.
  - **1RM estimado** (Epley) por sesión.
  - **Peso máximo por sesión** con banda de tendencia (media móvil 5 sesiones).
- Card "Comparativa vs últimas N sesiones": muestra delta de volumen, 1RM y RPE promedio contra el promedio de las 5 anteriores. Etiquetas: `mejora`, `estancamiento` (< 2% en 4 sesiones), `regresión`.
- Drilldown: tabla de las últimas 15 sesiones con expandible por sets.
- Hook nuevo `useExerciseProgress(exerciseKey, fromISO, toISO)` que agrega desde `exercise_set_logs` + `exercise_session_logs`.

## 5. Editar sesión importada + recálculo IA

- Nuevo diálogo `EditSessionDialog.tsx` (reusable con `RegisterWorkoutDialog` extendido con prop `initial`). Permite editar: fecha, ambiente, RPE global, descanso de sesión, molestias, warm-up, y sets (peso/reps/rpe por set, agregar/quitar).
- Al guardar (`useUpdateSessionLog`), replaza los `exercise_set_logs` en transacción (delete-then-insert) y llama a `ai-exercise-coach` modo `progression_adjust` para recalcular la próxima sesión programada del mismo `exercise_key`.
- Botón "Editar" en el detalle del calendario, en la lista de sesiones de `Ejercicios.tsx` y en la tabla de drilldown del panel de progreso (§4).

## 6. Migraciones y orden de ejecución

1. Migración A: `workout_plan_reminders`, `workout_sessions_scheduled`, columnas nuevas de `workout_import_batches` + GRANT/RLS.
2. Semilla en `ai_provider_policy` para las nuevas features `workout_reminders` y `progression_adjust` (modelo por defecto `google/gemini-3-flash-preview`).
3. Cron: `select cron.schedule('workout-reminders','*/15 * * * *', $$ ... $$)` vía `supabase--insert` (contiene la function URL).

## 7. Detalles técnicos

- Reutiliza `usePushNotifications` para toasts en vivo; no requiere código nuevo del lado cliente para las notifs.
- Todas las nuevas edge functions: CORS estándar, verify_jwt=true (validación con `getUser`), Zod en body, retorno JSON.
- Reglas de estilo: sin colores hardcodeados; tokens semánticos.
- Ninguna dependencia npm nueva salvo `papaparse` para el CSV (si no está instalada).

## Fuera de alcance

- Notificaciones push nativas (Capacitor Push): sigue igual, se limita a in-app + Google Calendar.
- Sincronización bidireccional con Google Calendar (solo escritura desde la app).

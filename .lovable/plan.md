# Ejercicios: sesiones enriquecidas, PDF, importación, calendario y planes IA

Amplío el módulo de Ejercicios ya existente (`/ejercicios`) con 5 capacidades pedidas. Reutilizo tablas actuales (`exercise_session_logs`, `exercise_set_logs`, `workout_plans`, `workout_sessions`, `exercise_catalog`) y agrego solo los campos y una tabla que faltan.

## 1. Bloque de calentamiento y notas de sesión

Extiendo `exercise_session_logs` (ya tiene `rpe` y `notes`) con:
- `warmup_notes text` — calentamiento realizado.
- `discomforts text` — molestias/lesiones (rodilla, hombro, etc.).
- `session_rest_sec int` — descanso promedio entre sets.

Rediseño `RegisterWorkoutDialog.tsx` con un paso final "Notas de la sesión" que captura RPE global, calentamiento, molestias y descanso promedio. Esos campos se pasan al `ai-exercise-coach` (prompt actualizado) para que la sugerencia de progresión tome en cuenta RPE alto, dolor reportado o descansos cortos antes de subir carga.

## 2. PDF resumen de sesión

Nuevo componente `SessionPdfExport.tsx` (jsPDF + autotable, ya usados en el proyecto) que genera:
- Encabezado con fecha, entorno, duración, RPE y HR promedio.
- Tabla de ejercicios con sets (peso × reps, 1RM Epley, volumen, distancia/tiempo si aplica).
- Comparativo vs. sesión previa por ejercicio (delta de volumen y peso máximo).
- Bloque "Recomendaciones del Coach IA" — llama a `ai-exercise-coach` en modo `mode:"session_summary"` para producir 3-5 líneas de próximos pasos basados en la sesión firmada.
- Notas, calentamiento y molestias al pie.

Boton "Descargar PDF" en el detalle de sesión (tarjeta en `EjercicioDetalle.tsx`) y en el historial de `Ejercicios.tsx`.

## 3. Importación CSV/JSON

Nueva página `/ejercicios/importar` con:
- Uploader que acepta `.csv` o `.json`.
- Plantilla descargable (`plantilla-entrenamientos.csv`) con columnas: `fecha, entorno, ejercicio, set, reps, peso_kg, distancia_m, duracion_seg, descanso_seg, rpe, notas`.
- Parser cliente (PapaParse ya está disponible o se agrega) que:
  - Match del ejercicio por nombre normalizado contra `exercise_catalog`; si no existe, sugiere el más cercano por similitud y permite mapear manualmente o crearlo como "custom".
  - Vista previa con validación (rango de RPE, valores negativos, fechas inválidas).
  - Agrupa filas por `fecha + entorno` en sesiones y sus sets.
- Inserta en `exercise_session_logs` + `exercise_set_logs` en batch. Al terminar refresca KPIs, sparkline y heatmap automáticamente (React Query invalidation).

## 4. Vista calendario

Agrego una pestaña "Calendario" en `Ejercicios.tsx` con `react-day-picker` (ya en el stack shadcn):
- Mes con marcadores de color por grupo muscular predominante de la sesión (`exercise_catalog.grupo_muscular`).
- Al hacer click en un día: popover con lista de sesiones de ese día y acceso al detalle (`/ejercicios/sesion/:id`) o al ejercicio individual.
- Filtro por entorno (gym/calle/casa) y por grupo muscular.
- Reusa la consulta existente + un `useMonthlySessions(monthStart, monthEnd)`.

Nueva ruta `/ejercicios/sesion/:sessionId` = `SesionDetalle.tsx` con sets desglosados, botón PDF y edición inline de notas/RPE.

## 5. Plan semanal con Coach IA

Ya existen `workout_plans` y `workout_sessions`; agrego `workout_exercises_planned` (o reuso `workout_exercises` existente — a confirmar en implementación) para la progresión objetivo por semana.

Añado campos a `workout_plans`:
- `weeks int default 4`
- `progression_scheme text` (`linear`, `double_progression`, `undulating`)
- `current_week int default 1`

Nueva página `/ejercicios/plan` con:
- Wizard "Crear plan": objetivo (fuerza/hipertrofia/resistencia/pérdida), nivel, días/semana, equipo disponible.
- Edge function `ai-workout-plan-generate`: genera el plan (JSON estructurado) con `google/gemini-3-flash-preview` y lo persiste en `workout_plans` + `workout_sessions` + ejercicios sugeridos del catálogo.
- Vista semanal: cada día con ejercicios objetivo (sets × reps × peso sugerido) y botón "Marcar como hecho" que abre el `RegisterWorkoutDialog` prellenado.
- Botón "Ajustar plan con Coach IA": edge function `ai-workout-plan-adjust` que lee las últimas 2-3 semanas de `exercise_session_logs`/`exercise_set_logs` del paciente y devuelve ajustes de carga, volumen o descanso semana a semana. Los cambios se muestran como diff antes de aplicarlos.

Governance: ambas funciones registran en `ai_provider_audit` con feature keys nuevas (`workout_plan_generate`, `workout_plan_adjust`) para que aparezcan en `/mis-datos-ia`.

## Detalles técnicos

- **Migración**: 1 sola. Agrega columnas a `exercise_session_logs` y `workout_plans`; opcional: tabla `workout_import_batches(id, patient_id, filename, rows_ok, rows_error, created_at)` para trazabilidad de imports. GRANTs completos y RLS por `patient_id = auth.uid()`.
- **Frontend nuevo**: `SesionDetalle.tsx`, `ImportarEntrenamientos.tsx`, `PlanSemanal.tsx`, `SessionPdfExport.tsx`, `ExerciseCalendar.tsx` (tab).
- **Frontend modificado**: `RegisterWorkoutDialog.tsx` (paso "Notas"), `Ejercicios.tsx` (tabs: Dashboard | Calendario | Plan | Importar), `EjercicioDetalle.tsx` (botón PDF).
- **Edge functions nuevas**: `ai-workout-plan-generate`, `ai-workout-plan-adjust`. Extiendo `ai-exercise-coach` con `mode:"session_summary"`.
- **Rutas**: `/ejercicios/sesion/:id`, `/ejercicios/importar`, `/ejercicios/plan` en `App.tsx`.
- **Dependencias**: `papaparse` (si aún no está); jsPDF/autotable ya presentes.
- **Auditoría IA**: nuevas features en `ai_provider_policy` con defaults Lovable.

```text
Ejercicios/
├── Tab Dashboard  ← KPIs + heatmap + tarjetas por ejercicio (existente)
├── Tab Calendario ← NUEVO: mes con marcadores por grupo muscular
├── Tab Plan       ← NUEVO: plan semanal + ajuste IA
└── Tab Importar   ← NUEVO: CSV/JSON con preview y mapeo
```

## Fuera de alcance

- Sincronización con relojes (ya cubierta por el módulo BLE y Health Connect existentes).
- Recordatorios push de rutina (se puede sumar después usando `pg_cron` como en citas).
- Videos demostrativos por ejercicio.

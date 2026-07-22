## Objetivo

Un módulo de ejercicios visual y llamativo donde el paciente registre entrenamientos —calle o gimnasio— por tipo/ejercicio, con gráficas por ejercicio, drilldown por sesión y sugerencias del Coach IA ya existente.

## Qué ya existe (se reutiliza)

- `workout_plans`, `workout_sessions`, `workout_exercises` (catálogo/plantilla) y `workout_logs` (bitácora diaria).
- `/actividad` con Coach IA (`ai-activity-coach`) y `activity_readings` para pasos/calorías/sueño.

## Qué falta y se agrega

### 1. Base de datos (una migración)

- `exercise_catalog` — catálogo maestro de ejercicios: `id, slug, name, category` (`fuerza|cardio|movilidad|deporte`), `environment` (`gym|calle|casa|ambos`), `muscle_group`, `equipment`, `metric_type` (`reps_weight|distance_time|time_only|reps_only`), `icon`, `is_public`.
- `exercise_session_logs` — cada entrenamiento realizado: `id, patient_id, fecha, environment, location_label, duration_min, rpe, hr_avg, calories, notes, source`.
- `exercise_set_logs` — sets por ejercicio dentro de una sesión: `id, session_log_id, exercise_id (fk exercise_catalog), set_number, reps, weight_kg, distance_m, duration_sec, rest_sec, rpe, notes`.
- Todas con RLS (paciente dueño + admin), GRANTs a `authenticated`/`service_role`.
- Semilla: ~40 ejercicios comunes (sentadilla, press banca, dominadas, running, ciclismo, burpees, plancha, etc.) con `environment` correcto para filtrar calle vs gym.

### 2. Frontend — nueva sección `/ejercicios`

Ruta nueva (no toca `/actividad`) enlazada desde el sidebar cerca de Actividad.

**Pantalla principal (Dashboard)**
- KPIs superiores: sesiones últimos 30 días, volumen total (kg·rep), tiempo total, calorías, racha de días.
- Tabs **Calle | Gimnasio | Todo**.
- Heatmap tipo GitHub de días entrenados (365 días).
- Grid llamativo de "Mis ejercicios" (tarjetas con icono, último PR, mini-sparkline de progreso).
- Botón grande "Registrar entrenamiento".

**Registrar entrenamiento (dialog wizard)**
- Paso 1: entorno (calle/gym/casa), fecha, ubicación libre.
- Paso 2: agregar ejercicios desde catálogo (búsqueda + filtro por grupo/equipo/entorno) o crear personalizado.
- Paso 3: por ejercicio, agregar sets según `metric_type` (reps+peso, distancia+tiempo, tiempo, reps).
- Paso 4: RPE global, FC promedio (auto desde `heart_rate_readings` del rango), notas, guardar.

**Drilldown por ejercicio** `/ejercicios/:exerciseId`
- Header con icono, grupo muscular, mejor marca (1RM estimado Epley para fuerza; mejor pace/tiempo para cardio).
- Gráfica principal (Recharts) con selector de métrica: peso máx, volumen, reps totales, 1RM estimado, pace, distancia.
- Rango: 7/30/90/365 días.
- Tabla de historial por sesión (fecha, sets, mejor set, volumen) con expand para ver todos los sets.
- Tarjeta "Coach IA": llama a `ai-activity-coach` con el contexto del ejercicio (últimas 8 sesiones) para sugerir progresión, deload o técnica. Botón "Pedir sugerencia".

**Drilldown por sesión** `/ejercicios/sesion/:sessionId`
- Resumen (duración, volumen, RPE, FC).
- Lista de ejercicios con sets y comparación vs sesión anterior del mismo ejercicio (delta peso/reps).

### 3. Integración con Coach IA

- Extender `ai-activity-coach` (edge function existente) para aceptar `context: { exerciseId?, recentSessions?, focus: "progresion" | "tecnica" | "plan_semanal" }`.
- El Coach recibe datos anonimizados de las últimas sesiones (números, no PII) y devuelve sugerencias estructuradas.
- Botón "Aplicar como plan" que crea un `workout_plan` a partir de la sugerencia (reutiliza tablas existentes).
- Widget "Sugerencia del día" en el dashboard de `/ejercicios` que consulta la última fila de `activity_ai_suggestions`.

### 4. Componentes UI reutilizables

- `ExerciseCard` (tarjeta con sparkline), `MetricLineChart`, `VolumeBarChart`, `SetsTable`, `TrainingHeatmap`, `RegisterWorkoutWizard`, `ExerciseCoachCard`.
- Diseño con tokens semánticos (teal/navy/cyan ya establecidos), animaciones sutiles al registrar set (confetti mínimo en PR), badges de PR y "Nuevo récord".

### 5. Sidebar / navegación

- Nueva entrada "Ejercicios" bajo la sección Salud, con icono Dumbbell.

## Fuera de alcance (siguiente iteración)

- Timer/cronómetro en vivo con voz.
- Comparativo social o rankings.
- Importación desde Strava/Garmin (usar la ruta existente de wearables si se quiere).
- Modificar `/actividad` o el flujo de `workout_plans` existentes salvo el "Aplicar como plan".

## Detalle técnico breve

- Recharts para gráficas (ya en el stack).
- Cálculo 1RM: Epley `peso * (1 + reps/30)`; se guarda derivado en el cliente, no en DB.
- Todas las escrituras pasan por hooks `useExerciseCatalog`, `useSessionLogs`, `useSetLogs` con React Query e invalidación por `exerciseId`/`sessionId`.
- Migración incluye GRANTs y policies (`auth.uid() = patient_id` para CRUD; `is_public = true` legible por todos en `exercise_catalog`).

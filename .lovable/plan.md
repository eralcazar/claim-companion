## Objetivo

Añadir dos monitores dedicados en la sección **Salud**, cada uno con su propia gráfica y captura manual, sin tocar el monitor de presión arterial ni el de frecuencia cardíaca (que ya existen por separado):

- **Monitor de Sueño** (`/sueno`): horas dormidas por día.
- **Monitor de Actividad / Pasos** (`/pasos`): pasos, minutos activos y calorías por día.

Ambos leen y escriben en la tabla ya existente `activity_readings` (columnas `fecha`, `steps`, `active_minutes`, `calories`, `sleep_minutes`, `source`, `device_name`, `patient_id`). No requiere migración.

## Alcance

### 1. Página `src/pages/SleepMonitor.tsx`
- Card resumen (últimas 24 h): horas dormidas + comparación con meta (`activity_goals.sleep_minutes_goal`, fallback 420 min).
- Gráfica de barras (recharts) de los últimos 30 días con horas dormidas por noche.
- KPI: promedio 7 días, promedio 30 días, mejor noche, noches por debajo de meta.
- Formulario "Registrar manualmente" (fecha + horas + minutos) que hace upsert en `activity_readings` con `source='manual'`, `sleep_minutes`.
- Nota de compatibilidad ("Se sincroniza desde Xiaomi/Mi Fitness vía Health Connect o Apple Health") con link a `/dispositivos`.

### 2. Página `src/pages/StepsMonitor.tsx`
- Card resumen día actual: pasos + progreso hacia `activity_goals.steps_goal` (fallback 8000).
- Gráfica de barras 30 días de `steps` con línea horizontal de meta.
- Segunda gráfica pequeña: `active_minutes` y `calories` (línea o barras apiladas).
- KPI: total 7 días, promedio 30 días, mejor día, racha (días consecutivos ≥ meta).
- Formulario manual (fecha + pasos + minutos activos opcionales + calorías opcional) → upsert en `activity_readings`.
- Misma nota de compatibilidad con Xiaomi.

### 3. Componente compartido `src/components/health/DailySeriesChart.tsx`
- Wrapper reutilizable sobre `recharts` (BarChart) con: props `data`, `dataKey`, `goal`, `unit`, `color`. Vacío-state y tooltip en español.
- Se reutiliza en los dos monitores nuevos (y queda disponible para futuros).

### 4. Sidebar y bottom nav
- En `src/components/AppSidebar.tsx` (`saludItems`), añadir:
  - `{ title: "Sueño", url: "/sueno", icon: <Moon>, feature: "perfil" }`
  - `{ title: "Pasos y actividad", url: "/pasos", icon: <Footprints>, feature: "perfil" }`
- Añadir imports de `Moon` y `Footprints` (`lucide-react`).
- Colocar ambos justo debajo de "Frecuencia cardíaca", antes de "Glucosa".

### 5. Rutas
- En `src/App.tsx` registrar dentro de `<ProtectedRoute>`:
  - `<Route path="/sueno" element={<SleepMonitor />} />`
  - `<Route path="/pasos" element={<StepsMonitor />} />`

## Fuera de alcance

- No se modifica `/presion` (BP monitor) ni `/frecuencia-cardiaca` (HR monitor).
- No se modifica `/actividad` (mantiene su bitácora, dispositivos y coach IA).
- No se cambia el esquema de `activity_readings` ni sus políticas RLS.
- No se agregan alertas ni notificaciones nuevas (fuera de alcance de este cambio).

## Notas técnicas

- Consultas: `SELECT fecha, steps, active_minutes, calories, sleep_minutes FROM activity_readings WHERE patient_id = auth.uid() AND fecha >= now() - interval '30 days' ORDER BY fecha` (RLS ya lo scopea).
- Upsert manual: `.upsert({ patient_id, fecha, sleep_minutes/steps/..., source: 'manual' }, { onConflict: 'patient_id,fecha' })` — si no existe unique index, hacer read-then-update/insert equivalente.
- Los monitores muestran una banner-link a `/dispositivos` para configurar Xiaomi/Mi Fitness.

## Archivos

- Nuevos: `src/pages/SleepMonitor.tsx`, `src/pages/StepsMonitor.tsx`, `src/components/health/DailySeriesChart.tsx`.
- Editados: `src/components/AppSidebar.tsx`, `src/App.tsx`.

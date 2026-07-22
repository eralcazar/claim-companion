# Plan — Actividad, Rutinas IA, Monitores por dispositivo y Paneles por especialidad

Divido en 4 bloques. Cada bloque es autocontenible y se puede aprobar/ejecutar por separado si prefieres.

---

## Bloque A — Monitoreo de Actividad + Rutinas + IA (nuevo módulo "Actividad")

Inspirado en Fitbit / Apple Fitness / Google Fit / Strava, adaptado a CareCentral (paciente + médico pueden ver).

### A1. Ruta y navegación
- Nueva ruta `/actividad` en `App.tsx`, entrada en `AppSidebar.tsx` (grupo Salud) y `BottomNav.tsx`.
- Página `src/pages/Actividad.tsx` con tabs: **Hoy**, **Tendencias**, **Rutinas**, **Recomendaciones IA**.

### A2. Dashboard "Hoy" (aprovecha datos ya sincronizados)
Reutiliza `activity_readings`, `heart_rate_readings`, `useUnifiedReadings`:
- Anillos de progreso (pasos, minutos activos, calorías estimadas) con meta configurable.
- Racha diaria (streak) + comparativo semana vs. semana previa.
- Zonas de frecuencia cardiaca del día (reposo/quema/cardio/pico) calculadas con FC máx = 220 − edad (de `profiles.date_of_birth`).
- Mini-cards: sueño (si viene de HealthKit/Health Connect), SpO2 promedio, presión última toma.

### A3. Rutinas de ejercicio programadas
Nuevas tablas (migración):
- `workout_plans` (owner_id, nombre, objetivo enum: perder_peso/tonificar/rehabilitacion/cardio/fuerza, nivel, dias_por_semana, created_by_role).
- `workout_sessions` (plan_id, day_of_week, orden, titulo, duracion_min, intensidad, notas).
- `workout_exercises` (session_id, nombre, series, reps, duracion_seg, descanso_seg, video_url opcional, grupo_muscular).
- `workout_logs` (user_id, session_id, fecha, completado, rpe 1-10, notas, hr_promedio nullable).
- RLS: dueño gestiona; médicos/nutricionistas con relación al paciente pueden asignar planes; GRANTs completos.
- Trigger para `updated_at`.

UI:
- `RoutinePlanner.tsx`: crear plan con builder por día (drag & drop simple con teclado).
- `TodayRoutineCard.tsx`: muestra la sesión de hoy con temporizador de series/descanso y botón "Marcar completado" que escribe `workout_logs`.
- Catálogo semilla de ~40 ejercicios (`src/lib/fitness/exerciseCatalog.ts`) con grupo muscular, equipo, contraindicaciones.

### A4. Recomendaciones IA (consume créditos Kari)
- Nueva edge function `ai-activity-coach` (Lovable AI, `google/gemini-3-flash-preview` por defecto):
  - Input: últimos 14 días de `activity_readings` + `heart_rate_readings` + `workout_logs` + condiciones activas (`medical_history_conditions`) + medicamentos + alertas.
  - Output estructurado (AI SDK `Output.object` con schema pequeño): `resumen`, `banderas_rojas[]`, `recomendaciones[]` (tipo, motivo, prioridad), `plan_sugerido` opcional.
  - Descuenta tokens usando la infra existente (`ai_token_balances`, `ai_token_usage_log`) — mismo patrón que `ai-kari-chat`.
  - Respeta contraindicaciones: si hay HTA no controlada o SpO2 bajo, sugiere baja intensidad y marca bandera roja.
- UI: tab **Recomendaciones IA** con botón "Generar sugerencia" (muestra costo estimado en tokens), historial de sugerencias y CTA "Aplicar plan sugerido" que crea un `workout_plan`.

---

## Bloque B — Monitores por dispositivo homologado

Objetivo: para cada dispositivo BLE marcado como compatible/verificado, mostrar un **monitor en vivo** con lectura streaming + guardado.

### B1. Auditar catálogo actual
- Recorrer `src/lib/ble/compatibleDevices.ts` y clasificar cada modelo por capacidad: `bp`, `spo2`, `hr`, `glucose`, `temperature`, `weight`, `activity`.
- Marcar en el catálogo qué característica GATT usa cada uno (varios ya están; completar los faltantes con base a la ficha del fabricante).

### B2. Monitores dedicados (páginas ya existen parcialmente)
Estado actual y trabajo restante:
- Presión: `PresionArterial.tsx` ✅ → agregar botón "Monitor en vivo" que abra `BleAssistedMeasurement` filtrado por tipo `bp`.
- SpO2: `OxygenSaturation.tsx` ✅ → mismo patrón, tipo `spo2` + gráfico de pletismografía si el dispositivo lo expone.
- Glucosa: `Glucosa.tsx` ✅ → soporte CGM (streaming) para modelos que lo permitan.
- Temperatura: `Temperatura.tsx` ✅ → monitor con curva 60 s.
- Frecuencia cardiaca: nueva `FrecuenciaCardiaca.tsx` con monitor en vivo (banda pectoral / smartwatch).
- Peso/composición: nueva `Peso.tsx` + tabla `weight_readings` (kg, %grasa, %agua, imc) + BLE Weight Scale profile.
- Actividad: usa Bloque A.

### B3. Componente reutilizable `DeviceLiveMonitor`
- Un solo componente que recibe `capability` y muestra: estado de conexión, valor actual grande, mini-gráfico últimos 60 s, botón "Guardar lectura", advertencias fuera de rango.
- Reutiliza `src/lib/ble/*` y `useBleDevices`.

### B4. Validación / homologación
- Extender `user_device_verifications` con campos: `capability_tested[]`, `passed`, `deviation_pct`, `reference_device`.
- Formulario de validación por capacidad (no solo "sí/no" global).
- Badge "Homologado por N usuarios" en la ficha pública del dispositivo.

---

## Bloque C — Paneles por especialidad

Complementar especialidades que hoy solo aparecen en el catálogo pero no tienen UI dedicada. Propuesta (te muestro; tú marcas cuáles priorizar):

| Especialidad | Panel propuesto | Reutiliza |
|---|---|---|
| Cardiología | Panel con ECG import, FC 24h, PA, riesgo Framingham | `heart_rate_readings`, `blood_pressure_readings` |
| Endocrinología | Tablero glucosa (AGP), HbA1c, insulina | `glucose_readings` |
| Neumología | SpO2 nocturno, espirometrías, oxigenoterapia | `spo2_readings` |
| Pediatría | Curvas OMS (peso/talla/IMC/PC), vacunas, hitos | nuevo `pediatric_growth` |
| Ginecología | Ciclo menstrual, embarazo/FPP, tamizajes | nuevo `gyn_cycles` |
| Psicología/Psiquiatría | Escalas (PHQ-9, GAD-7), diario de ánimo, sesiones | nuevo `mental_scales` |
| Fisioterapia/Rehab | Plan de ejercicios asignado (usa Bloque A), goniometría, dolor VAS | `workout_plans` |
| Nutrición | Ya existe → agregar plan alimenticio + macros diarios | `nutrition_*` |
| Oftalmología | Agudeza, refracción, PIO | nuevo `ophtha_exams` |
| Dermatología | Galería lesional con seguimiento (regla ABCDE) | `body_annotations` |
| Traumatología | Mapa de dolor + ROM + rutinas de rehab | `body_annotations` + `workout_plans` |

Cada panel: página `src/pages/especialidad/<slug>.tsx` visible solo si el rol activo o la relación médico-paciente lo permite, más entrada dinámica en sidebar según especialidad favorita/activa.

---

## Bloque D — Cerrar pendientes anteriores

1. **CI axe-core + Playwright** (`.github/workflows/a11y.yml`) con specs para atajos `/`, `g h`, `g c`, `g s`, `?` y foco en sidebar/búsqueda/bottom-nav.
2. **E2E enlaces compartibles**: dos usuarios, uno crea filtro compartible, otro abre y verifica país/área/sector/texto/favoritas idénticas.

---

## Cómo propongo ejecutar

Sugiero orden por impacto visible:
1. **Bloque A completo** (actividad + rutinas + IA) — es lo que más "llena" la app.
2. **Bloque B** (monitores unificados + peso + FC dedicada + validación por capacidad).
3. **Bloque C** por especialidad, en tandas de 2-3 paneles.
4. **Bloque D** al final (infra de tests, no cambia UX).

### Preguntas antes de arrancar (respóndelas y arranco con el Bloque A):
1. ¿Metas por defecto para actividad? Sugiero 8 000 pasos, 30 min activos, 7 h sueño — configurables.
2. ¿Costo en tokens Kari por sugerencia IA? Sugiero 50 tokens por análisis (ajustable).
3. Para Bloque C, ¿empiezo con **Cardiología + Endocrinología + Pediatría** o prefieres otras 3?

## Detalles técnicos clave
- Nada de nuevos secrets; usa `LOVABLE_API_KEY` ya presente para IA.
- Todas las tablas nuevas siguen el patrón `CREATE TABLE → GRANT → RLS → POLICY` en la misma migración.
- `Output.object` schemas se mantienen chicos (sin `.min/.max`); límites van en el prompt y se validan en código.
- Reutilizo hooks existentes (`useUnifiedReadings`, `useBleDevices`, `useKariTokens`) para no duplicar lógica.

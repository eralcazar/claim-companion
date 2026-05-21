## Objetivo
Agregar dos módulos clínicos nuevos al **Consultorio Digital** (y al Expediente del paciente): **Temperatura corporal** y **Glucosa capilar**, con registro de lecturas, listado histórico y gráficas de tendencia, siguiendo exactamente el mismo patrón que ya existe para **Presión arterial** y **Saturación de oxígeno (SpO2)**.

## Alcance funcional

Para cada uno de los dos módulos (Temperatura y Glucosa):

- Formulario para capturar una lectura (fecha/hora, valor, contexto y notas).
- Lista cronológica de lecturas con badges de clasificación clínica.
- Gráfica de tendencia (line chart con `recharts`) con líneas de referencia para rangos normales / alterados.
- Edición y borrado de lecturas propias (creator/admin), respetando RLS.
- Acceso desde el Consultorio del médico y desde el Expediente Digital del paciente.

### Clasificación clínica

**Temperatura (°C)**
- Hipotermia: < 35.0 (destructive)
- Normal: 35.0 – 37.4 (success)
- Febrícula: 37.5 – 37.9 (warning)
- Fiebre: 38.0 – 39.4 (destructive suave)
- Fiebre alta: ≥ 39.5 (destructive)

**Glucosa (mg/dL)** — campo `context` define interpretación (ayuno / postprandial / aleatoria):
- Hipoglucemia: < 70 (destructive)
- Ayuno normal: 70 – 99 (success)
- Prediabetes ayuno: 100 – 125 (warning)
- Diabetes ayuno: ≥ 126 (destructive)
- Postprandial normal: < 140 (success), alterada 140–199 (warning), diabetes ≥ 200 (destructive)

## Cambios técnicos

### 1. Base de datos (migración)

Crear dos tablas espejo de `spo2_readings`:

```sql
-- temperature_readings
id uuid pk, patient_id uuid, taken_at timestamptz default now(),
temperature_c numeric(4,2) not null,
method text,            -- oral, axilar, timpánica, rectal, frontal
context text, notes text,
created_by uuid not null,
created_at, updated_at

-- glucose_readings
id uuid pk, patient_id uuid, taken_at timestamptz default now(),
glucose_mgdl integer not null,
measurement_context text not null default 'aleatoria', -- ayuno | postprandial | aleatoria | pre_comida
hours_since_meal numeric,
notes text,
created_by uuid not null,
created_at, updated_at
```

RLS idéntico al de `blood_pressure_readings`:
- SELECT: paciente, creador, admin o `has_patient_access(auth.uid(), patient_id)`.
- INSERT: `created_by = auth.uid()` y (paciente, admin o personal con acceso).
- UPDATE/DELETE: creador o admin.

Trigger `update_updated_at_column` en ambas tablas.

### 2. Hooks

- `src/hooks/useTemperature.ts` — `useTemperatureReadings`, `useCreateTemperature`, `useUpdateTemperature`, `useDeleteTemperature`, `classifyTemperature`. Mismo shape que `useOxygenSaturation.ts`.
- `src/hooks/useGlucose.ts` — equivalente, con `classifyGlucose(value, context)`.

### 3. Componentes

```
src/components/temperature/
  TemperatureModule.tsx        // wrapper con form + lista + gráfica (paciente, name, canEdit)
  TemperatureForm.tsx
  TemperatureList.tsx
  TemperatureChart.tsx         // recharts LineChart + ReferenceLine 37.5 / 38
src/components/glucose/
  GlucoseModule.tsx
  GlucoseForm.tsx
  GlucoseList.tsx
  GlucoseChart.tsx             // ReferenceLines 70 / 100 / 126
```

Usar tokens semánticos (`hsl(var(--primary))`, `--success`, `--warning`, `--destructive`) — sin colores hardcoded.

### 4. Páginas

- `src/pages/Temperatura.tsx` y `src/pages/Glucosa.tsx`, espejos de `OxygenSaturation.tsx`, soportando impersonación via `useEffectiveUserId`.

### 5. Navegación / integración

- `src/components/expediente/PatientExpedienteTabs.tsx`: agregar tabs **"Temperatura"** (icon `Thermometer`) y **"Glucosa"** (icon `Droplet`) en una tercera fila `grid-cols-2` (o expandir filas existentes a `grid-cols-5`).
- `src/App.tsx`: rutas `/temperatura` y `/glucosa` protegidas igual que `/oxigenacion`.
- `src/components/AppSidebar.tsx` y `src/components/BottomNav.tsx`: enlaces opcionales (solo si ya están Presión/Oxigenación visibles para ese rol).

### 6. Tendencias

`src/hooks/useTendencias.ts` ya agrupa por `nombre_indicador` desde estudios. **No** se modifica: las nuevas lecturas viven en sus propias tablas y se grafican en su módulo dedicado.

## Notas

- Toda la UI en español, mobile-first, con `rounded-2xl` y paleta CareCentral (teal/navy/cyan) — sin colores literales.
- Los módulos no consumen tokens de IA (no usan OCR ni LLM).
- Permisos: paciente edita los suyos, médico/enfermero/admin con `has_patient_access` pueden registrar lecturas; broker solo lectura.

## ¿Confirmas?

Si apruebas, paso a build mode y ejecuto: migración → hooks → componentes → páginas → integración en tabs/rutas.



## Fase 1 — Registro de Presión Arterial

Módulo nuevo y autocontenido para que paciente y personal autorizado registren tomas de presión, las visualicen en grid + gráfico, y las exporten a CSV.

### 1. Base de datos (migración)

Tabla nueva `blood_pressure_readings`:

| columna | tipo | notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `patient_id` | uuid | dueño del registro |
| `taken_at` | timestamptz | fecha/hora de la toma (default `now()`) |
| `systolic` | int | mmHg, validar 50–260 |
| `diastolic` | int | mmHg, validar 30–200 |
| `pulse` | int nullable | latidos por minuto, validar 20–250 |
| `position` | text nullable | sentado/parado/acostado (free text) |
| `arm` | text nullable | izquierdo/derecho |
| `notes` | text nullable | |
| `created_by` | uuid | quién registró |
| `created_at` / `updated_at` | timestamptz | |

Validación con **trigger** (no CHECK, por la regla del proyecto) que rechaza valores fuera de rango y `systolic <= diastolic`.

### 2. RLS

Mismo patrón que `body_annotations`:

- **SELECT**: paciente propio, `created_by`, admin, o `has_patient_access(auth.uid(), patient_id)` (cubre médico, enfermero, broker asignado).
- **INSERT**: paciente propio, admin, o personal con `has_patient_access` (médico/enfermero/broker asignado). `created_by = auth.uid()` obligatorio.
- **UPDATE / DELETE**: solo `created_by` o admin.

### 3. Hook `useBloodPressure`

`src/hooks/useBloodPressure.ts`:

- `useBloodPressureReadings(patientId)` → React Query, ordenado por `taken_at` desc.
- `useCreateBloodPressure()`, `useUpdateBloodPressure()`, `useDeleteBloodPressure()` con invalidación.
- Helper `classifyBP(sys, dia)` → categoría visual (Normal / Elevada / Hipertensión 1 / Hipertensión 2 / Crisis) con color token.

### 4. Página `/presion`

`src/pages/PresionArterial.tsx`:

- Header con nombre del paciente activo (paciente propio, o seleccionado si es personal con varios asignados — reutilizar patrón de `Consultorio.tsx`).
- **Botón "Nueva toma"** → dialog con form (fecha/hora con default `now()`, sistólica, diastólica, pulso, posición, brazo, notas).
- **Tarjetas resumen**: última toma, promedio últimos 7 días, # tomas mes actual.
- **Gráfico** (recharts): líneas sistólica/diastólica + barra de pulso, eje X por fecha, en `Card`.
- **Grid** editable: tabla con fecha, sistólica, diastólica, pulso, categoría (badge coloreado), notas, acciones (editar/borrar — solo si `created_by === user.id` o admin).
- **Botón "Exportar CSV"** reutilizando el patrón de `exportTendenciasCSV.ts` → archivo con meta + tomas + clasificación.

### 5. Integración en navegación

- `src/lib/features.ts`: nueva `FeatureKey "presion_arterial"` con label "Presión arterial", ruta `/presion`, icono `Activity`, grupo `principal`.
- `src/components/AppSidebar.tsx`: agregar a `mainItems`.
- `src/components/BottomNav.tsx`: reemplazar uno de los tabs poco usados (no — el bottom nav está lleno; **dejarlo solo en sidebar** y agregar acceso desde Dashboard como "tarjeta rápida").
- `src/pages/Dashboard.tsx`: nueva tarjeta "Última presión" con CTA a `/presion`.
- `src/pages/PatientView.tsx`: nueva pestaña "Presión" con el mismo componente en modo lectura+escritura según `canEditBody`.

### 6. Permisos

- En `usePermissions`: `presion_arterial` visible para todos los roles autenticados (paciente lo ve para sí mismo, personal para asignados).
- Filtrado real por RLS — el frontend solo pinta el menú.

### Lo que NO cambia

- Sin cambios en planes/suscripciones (eso es Fase 2).
- Sin cambios en agenda, recetas, CFDI, nutrición.
- Sin cambios en OAuth ni en tablas existentes.

### Diagrama UX

```text
/presion
┌────────────────────────────────────────────┐
│ Presión arterial — Juan Pérez   [+ Nueva]  │
├────────────────────────────────────────────┤
│ [Última: 128/82] [Prom 7d: 124/80] [12]    │
├────────────────────────────────────────────┤
│ ┌────────── Gráfico líneas ──────────┐    │
│ │ sistólica ─── diastólica ─── pulso │    │
│ └─────────────────────────────────────┘    │
├────────────────────────────────────────────┤
│ Fecha     Sis  Dia  FC  Cat       [✏️ 🗑]  │
│ 23/04 09  128  82   72  Normal             │
│ 22/04 21  142  91   80  HTA-1              │
│ ...                                         │
│                              [Exportar CSV] │
└────────────────────────────────────────────┘
```

### Entregable de esta fase

Paciente y personal con acceso pueden registrar, ver, editar, borrar, graficar y exportar tomas de presión. Listo para extender en futuras fases con alertas o vínculos a citas.


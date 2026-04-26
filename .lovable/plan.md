## Problema

`src/pages/OxygenSaturation.tsx` importa 3 componentes que **no existen** → el build se rompe:
- `@/components/oxygen-saturation/SpO2Form`
- `@/components/oxygen-saturation/SpO2List`
- `@/components/oxygen-saturation/SpO2Chart`

Además `AppSidebar.tsx` usa `feature: "oxygen_saturation"` pero esa clave no está declarada en `src/lib/features.ts` → error de TypeScript.

## Solución (Opción B: con persistencia en Lovable Cloud)

Replicar el patrón ya usado por **Presión Arterial** (`useBloodPressure` + `BloodPressureModule`). Mismo nivel de calidad, RLS, React Query, validaciones, y se podrá integrar a "Tendencias" después.

### 1. Base de datos — nueva tabla `spo2_readings`

```sql
CREATE TABLE public.spo2_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  spo2 integer NOT NULL,           -- 0-100 %
  pulse integer,                    -- bpm opcional
  notes text,
  context text,                     -- 'reposo' | 'actividad' | 'sueño' | etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spo2_readings ENABLE ROW LEVEL SECURITY;
```

**RLS** (mismo patrón que `blood_pressure_readings`, usa `has_patient_access`):
- SELECT: paciente, creador, admin, o personal con acceso
- INSERT: `created_by = auth.uid()` y tiene acceso al paciente
- UPDATE / DELETE: creador o admin

**Validación trigger** (rangos médicos seguros):
- `spo2` entre 50 y 100
- `pulse` entre 20 y 250 si se provee

**Trigger** `update_updated_at_column` (ya existe en BD).

### 2. Hook `src/hooks/useOxygenSaturation.ts`

Espejo de `useBloodPressure.ts`:
- `classifySpO2(value)` → `{ key, label, className }` con tokens semánticos:
  - `≥95` Normal (success)
  - `90-94` Bajo (warning)
  - `85-89` Crítico (destructive/80)
  - `<85` Emergencia (destructive)
- `useSpO2Readings(patientId)` — query
- `useCreateSpO2()` / `useUpdateSpO2()` / `useDeleteSpO2()` — mutations con toasts en español

### 3. Componentes en `src/components/oxygen-saturation/`

- **`SpO2Form.tsx`** — input con `Input` de shadcn, validación 0-100, fecha/hora, contexto, notas, pulso opcional. `onSuccess` callback para refrescar lista.
- **`SpO2List.tsx`** — tabla con shadcn `Table`, columnas: fecha, %SpO2, pulso, contexto, badge de clasificación, acciones editar/eliminar (con `AlertDialog` de confirmación).
- **`SpO2Chart.tsx`** — `LineChart` de Recharts con línea de %SpO2 en el tiempo, líneas de referencia en 95 y 90, tooltip en español, formato de fecha con `date-fns/locale/es`.

Todos usan tokens semánticos de Tailwind (no colores hardcoded), siguiendo la regla del proyecto.

### 4. `src/pages/OxygenSaturation.tsx`

Mantener tal cual está (ya está bien con `Tabs` Registrar / Historial / Tendencias). Solo va a funcionar porque ahora los 3 componentes existirán.

Pasar `patientId={user.id}` desde `useAuth` a los componentes.

### 5. `src/lib/features.ts`

Agregar:
```ts
| "oxygen_saturation"
```
a `FeatureKey` y entrada en `AVAILABLE_FEATURES`:
```ts
{ key: "oxygen_saturation", label: "SpO2", route: "/oxygen-saturation", icon: Activity, group: "principal" }
```

Esto hace que aparezca en el Gestor de Perfiles de Acceso y se pueda permisar por rol.

### 6. Tipos de Supabase

`src/integrations/supabase/types.ts` se regenera automáticamente al correr la migración. No tocarlo.

## Resultado

- ✅ Build vuelve a compilar
- ✅ Los registros de SpO2 se guardan en BD por usuario, con RLS
- ✅ Personal asignado / brokers pueden ver lecturas de sus pacientes (igual que presión arterial)
- ✅ Aparece en sidebar y se puede gestionar permiso por rol
- ✅ Listo para integrarse a "Tendencias" después si querés

## Aprobación

Cuando aprobés el plan, ejecuto en este orden:
1. Migración SQL (tabla + RLS + trigger validación)
2. Hook + 3 componentes + actualización de `features.ts`
3. Verifico que no queden errores de tipos

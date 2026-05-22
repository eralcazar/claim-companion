## Módulo Historial Médico

Historial clínico completo del paciente integrado **como pestaña** dentro de `ExpedienteDigital` y `PatientExpedienteTabs` (consultorio del médico). Sin nueva ruta independiente.

### 1. Base de datos (una migración)

Cuatro tablas, todas con `patient_id uuid`, `created_by uuid`, timestamps y RLS.

**`medical_history_conditions`** — antecedentes personales
- `tipo` enum: `cronica | cirugia | hospitalizacion | otra`
- `nombre` text, `diagnosticado_en` date null, `estado` (`activa | resuelta | en_control`), `notas`

**`medical_history_family`** — antecedentes familiares
- `parentesco` (`padre | madre | hermano | hermana | abuelo_paterno | abuela_paterna | abuelo_materno | abuela_materna | tio | tia | otro`)
- `condicion` text, `edad_diagnostico` int null, `vive` bool, `notas`

**`medical_history_allergies`** — alergias
- `sustancia` text, `tipo` (`medicamento | alimento | ambiental | otro`)
- `severidad` (`leve | moderada | severa | anafilaxia`), `reaccion` text, `notas`

**`medical_history_lifestyle`** — hábitos (una sola fila por paciente, upsert)
- `tabaco` (`nunca | exfumador | activo`), `tabaco_cantidad_dia` int
- `alcohol` (`nunca | ocasional | frecuente`), `alcohol_unidades_semana` int
- `ejercicio` (`sedentario | ligero | moderado | intenso`), `ejercicio_minutos_semana` int
- `vacunas` jsonb (lista `[{nombre, fecha}]`), `notas`

**RLS (mismo patrón que `nutrition_metrics`):**
- SELECT/INSERT/UPDATE/DELETE: paciente + `created_by` + admin + `has_patient_access(auth.uid(), patient_id)`

**Triggers de validación** (no CHECK):
- enums válidos
- `tabaco_cantidad_dia` ≥ 0, `alcohol_unidades_semana` ≥ 0, `ejercicio_minutos_semana` 0-10080
- `updated_at = now()`

### 2. Features y permisos

`src/lib/features.ts`: agregar `FeatureKey` **`historial_medico`** (icono `ClipboardList`, grupo `principal`, ruta `/expediente?tab=historial`).

Seed en `role_permissions`: `historial_medico` permitido para `paciente`, `medico`, `enfermero`, `admin`.

### 3. Hook `src/hooks/useMedicalHistory.ts`

- `useConditions(patientId)`, `useCreateCondition`, `useUpdateCondition`, `useDeleteCondition`
- `useFamilyHistory(patientId)` + CRUD
- `useAllergies(patientId)` + CRUD
- `useLifestyle(patientId)` — get + `useUpsertLifestyle`

### 4. Componente `src/components/historial/HistorialMedico.tsx`

Componente reutilizable que recibe `patientId` y `canEdit`. Cuatro sub-secciones en `Accordion` o sub-tabs:

1. **Antecedentes personales** — tabla editable, badges por `estado`, botón "Agregar"
2. **Antecedentes familiares** — agrupado por parentesco, dialog para CRUD
3. **Alergias** — cards con badge de severidad coloreado (leve verde, moderada amarillo, severa naranja, anafilaxia rojo), botón "Agregar"
4. **Estilo de vida** — formulario único con selects + listado de vacunas (sub-CRUD)

Permisos: paciente del registro y personal con `has_patient_access` pueden editar. Si `canEdit=false`, todo es solo lectura.

### 5. Integración (sin sidebar)

**`src/pages/ExpedienteDigital.tsx`** — agregar tab **"Historial"** (icono `ClipboardList`) en `TABS_ROW_1` o nueva fila. Renderiza `<HistorialMedico patientId={user.id} canEdit={true} />`.

**`src/components/expediente/PatientExpedienteTabs.tsx`** — agregar tab "Historial" que renderiza `<HistorialMedico patientId={patientId} canEdit />` (el médico/enfermero edita el del paciente activo).

**Dashboard del paciente** — opcional: tarjeta resumen con # alergias activas y link a la pestaña.

### Archivos

- **Nuevo**: migración SQL, `src/hooks/useMedicalHistory.ts`, `src/components/historial/HistorialMedico.tsx`
- **Modificar**: `src/lib/features.ts`, `src/pages/ExpedienteDigital.tsx`, `src/components/expediente/PatientExpedienteTabs.tsx`
- **Datos**: insert en `role_permissions` para `historial_medico`

### Lo que NO cambia

- No se agrega ruta nueva ni entrada al sidebar/bottom nav.
- No se tocan medicamentos, recetas, estudios, nutrición ni OCR.

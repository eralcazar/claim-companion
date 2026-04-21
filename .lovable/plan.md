

## Objetivo

1. El paciente puede **ver** las observaciones del médico desde su agenda (solo lectura — ya implementado parcialmente, hay que verificar que la query traiga el campo).
2. En el formulario de Agenda mostrar el **nombre del paciente** como campo de solo lectura (autocompletado con el usuario actual).
3. Permitir al **médico** acceder a Agenda desde su panel y registrar citas, con un selector que busca pacientes (rol `paciente`). Para el médico, su propio nombre aparece como solo lectura en el campo "Médico".
4. Tanto **paciente** como **médico** ven la cita en su agenda (el paciente ya la ve por `user_id`; el médico la verá en su Panel Médico por `doctor_id`).

## Cambios

### 1. `Appointments.tsx` — formulario unificado paciente / médico

- Detectar si el usuario actual es médico (`roles.includes("medico")`) o paciente.
- Nuevo estado `form.patient_id` (UUID del paciente). Para pacientes, se fija al `user.id` actual y se renderiza como Input deshabilitado mostrando su nombre.
- Para médicos, se reemplaza por un **buscador de pacientes**:
  - Componente `Popover` + `Command` (cmdk) con búsqueda por nombre/email.
  - Carga vía nuevo hook `usePatients()`: lista usuarios con rol `paciente` desde `user_roles` + `profiles`. Igual patrón que `useDoctors`.
  - Solo visible para médicos.
- Campo "Médico":
  - Si el usuario actual es médico → Input de solo lectura con su propio nombre (preset desde `profiles`); no se puede cambiar; el `doctor_id` se fija a `user.id`.
  - Si es paciente → comportamiento actual (select con doctores + opción manual).
- `buildPayload()` ajustado:
  - `user_id`: `form.patient_id` (paciente actual o el seleccionado por el médico).
  - `doctor_id`: para médicos, `user.id`; para pacientes, el seleccionado.
- Mutación `createMutation`: sigue insertando con el `user_id` del payload. RLS necesita permitir al médico insertar para otro paciente (ver paso 4).
- Header de la página: cambiar título a "Agenda" o "Mis citas" / "Mis citas como médico" según rol.
- Lista mostrada:
  - Paciente: ya muestra sus citas (`eq("user_id", effectiveUserId)`).
  - Médico: query adicional/alternativa que también incluye citas donde `doctor_id = user.id` (UNION en cliente: dos queries y merge dedup por id). Así, si el médico crea cita para un paciente, también la ve en `/agenda`.

### 2. Acceso del médico a `/agenda`

- En `src/lib/features.ts` (o donde estén los `FeatureKey`) ya existe `agenda`. Asegurar que el rol `medico` tenga `allowed=true` para `agenda` insertando una fila en `role_permissions`. Si ya existe pero está en `false`, actualizarla.
- En `AppSidebar.tsx`: el item "Agenda" ya está bajo `mainItems`, así que aparecerá automáticamente al habilitar el permiso.

### 3. Visualización de observaciones para el paciente

- Verificar `Appointments.tsx`: actualmente la query `select("*")` ya trae `doctor_observations`. El `AppointmentDetailDialog` ya las muestra en modo lectura cuando `canEditDoctorObservations=false`. **No requiere cambios funcionales** — solo confirmar que se pasa correctamente. Mejorar el placeholder cuando no hay observaciones diciendo "El médico aún no ha registrado observaciones".

### 4. Migración de base de datos

- **RLS `appointments`**: agregar política para que un médico pueda insertar/actualizar citas donde `doctor_id = auth.uid()`:
  - `CREATE POLICY "Doctors can insert appts they attend" ON appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id AND has_role(auth.uid(), 'medico'));`
  - La política UPDATE ya existe.
- **Permisos**: `INSERT INTO role_permissions(role, feature_key, allowed) VALUES ('medico','agenda',true) ON CONFLICT (role, feature_key) DO UPDATE SET allowed=true;` (vía tool de insert).

### 5. Hook nuevo `src/hooks/usePatients.ts`

- Mismo patrón que `useDoctors`. Devuelve `{ user_id, full_name, email }[]` para usuarios con rol `paciente`.
- Usado solo por médicos al crear citas.

### 6. Componente nuevo `src/components/appointments/PatientSelect.tsx`

- Combobox (Popover + Command) buscable por nombre/email. Recibe `value` y `onChange(userId, fullName)`.

### 7. Archivos a tocar

**Modificados:**
- `src/pages/Appointments.tsx` — campo nombre paciente (lectura para pacientes, selector para médicos), médico autocompletado para médicos, query union médico.
- Migración SQL: nueva policy INSERT para médicos en `appointments`.
- `role_permissions`: insert/update para `medico`+`agenda`.

**Creados:**
- `src/hooks/usePatients.ts`
- `src/components/appointments/PatientSelect.tsx`

**Sin cambios funcionales (solo verificación):**
- `AppointmentDetailDialog.tsx` ya muestra observaciones en lectura cuando no se puede editar.
- `DoctorPanel.tsx` ya lista todas las citas con `doctor_id = user.id`, así que las creadas por el propio médico aparecerán automáticamente.

## Resultado esperado

- **Paciente** abre `/agenda`: ve su nombre prellenado (solo lectura) en el formulario de nueva cita; al abrir el detalle de una cita, ve las observaciones del médico en modo lectura.
- **Médico** abre `/agenda` (recién habilitada): el formulario muestra su propio nombre como médico (solo lectura) y un buscador de pacientes para elegir a quién pertenece la cita; al guardar, la cita aparece tanto en su Panel Médico como en la agenda del paciente seleccionado.
- Las políticas RLS garantizan que solo médicos puedan crear citas donde ellos sean el `doctor_id`.


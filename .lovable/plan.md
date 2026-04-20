

## Objetivo

Permitir asignar un broker responsable a cada paciente desde el grid de usuarios, con carga masiva por CSV (descarga de plantilla + importación), y que el broker vea y opere en nombre de sus pacientes en el panel.

## Cambios

### 1. Nueva columna "Broker asignado" en `/admin/usuarios`

En el grid, agregar columna entre "Email" y los toggles de roles:
- Si el usuario **tiene rol paciente** → muestra un `Select` con la lista de brokers disponibles (más opción "Sin broker"), seleccionable inline.
- Si el usuario **no es paciente** → muestra `—` deshabilitado.
- Al cambiar la selección: hace `upsert` en `broker_patients` (borra asignación previa, inserta la nueva). Toast de confirmación.
- Si se quita el rol paciente, se limpia automáticamente la asignación de broker.

**Archivos:**
- `src/components/admin/UserRolesRow.tsx` — agregar celda con Select de brokers, lógica de asignar/desasignar.
- `src/pages/admin/UserManager.tsx` — query incluye lista de brokers + asignaciones existentes; pasa props al row.

### 2. Botones de carga masiva en la cabecera del grid

Junto al buscador, agregar dos botones:
- **"Descargar plantilla"** → genera CSV con headers: `email_paciente, email_broker`. Incluye una fila de ejemplo.
- **"Importar asignaciones"** → abre el `CSVImportDialog` (ya existe, reutilizable). Valida que cada email exista en `profiles`, que el broker tenga rol `broker` y el paciente tenga rol `paciente`. Muestra preview, ejecuta upsert masivo en `broker_patients`.

**Archivos:**
- `src/pages/admin/UserManager.tsx` — botones + estado del diálogo.
- `src/components/admin/BrokerAssignmentImportDialog.tsx` (nuevo) — wrapper de `CSVImportDialog` con validación y lógica de import específica.

### 3. Panel del Broker mejorado

`BrokerPanel.tsx` ya muestra la lista. Mejorar para que pueda **operar en nombre del paciente**:
- Cada tarjeta de paciente con un botón **"Ver / actuar como"** que abre la vista del paciente.
- Al entrar en modo "actuar como", se guarda el `patient_id` activo en un contexto (`ImpersonationContext`) y aparece un banner superior fijo: `"Operando en nombre de [Nombre]" [Salir]`.
- Mientras esté activo, las páginas de pólizas, reclamos, citas, medicamentos y registros usan ese `patient_id` en lugar del `user.id` propio del broker.

**Archivos:**
- `src/contexts/ImpersonationContext.tsx` (nuevo) — guarda `actingAsPatientId` + nombre, con `setActingAs` y `clearActingAs`.
- `src/components/ImpersonationBanner.tsx` (nuevo) — banner fijo en el `AppLayout`.
- `src/pages/BrokerPanel.tsx` — botón "Actuar como" por paciente.
- `src/components/AppLayout.tsx` — montar el banner.
- Páginas `Policies.tsx`, `Claims.tsx`, `NewClaim.tsx`, `Appointments.tsx`, `Medications.tsx`, `MedicalRecords.tsx` — leer `actingAsPatientId ?? user.id` al consultar y al insertar.

### 4. Permisos de base de datos

Las RLS actuales **ya permiten** al broker leer pólizas, claims, profiles y claim_forms de pacientes asignados. Falta agregar permisos de **escritura** para que pueda crear/editar en nombre del paciente:

- `claims`: ya tiene `Brokers can update assigned claims`. Falta `INSERT` para brokers.
- `claim_forms`: solo SELECT para brokers. Falta `INSERT` y `UPDATE`.
- `insurance_policies`: solo SELECT. Falta `INSERT` y `UPDATE`.
- `appointments`, `medications`, `medical_records`: agregar políticas para brokers asignados (SELECT/INSERT/UPDATE).

Migración SQL nueva con esas políticas, validando vía `EXISTS (SELECT 1 FROM broker_patients WHERE broker_id = auth.uid() AND patient_id = X.user_id)` y `has_role(auth.uid(),'broker')`.

### 5. Validaciones

- Un paciente solo puede tener **un broker** asignado a la vez. Si se reasigna, se elimina la fila previa.
- En import CSV: filas con email inexistente, broker sin rol broker, o paciente sin rol paciente → marcadas como inválidas y se omiten.
- Solo admin puede asignar brokers (RLS ya lo permite).

## Resumen archivos

Nuevos:
- `src/components/admin/BrokerAssignmentImportDialog.tsx`
- `src/contexts/ImpersonationContext.tsx`
- `src/components/ImpersonationBanner.tsx`
- Migración SQL para políticas de broker

Modificados:
- `src/pages/admin/UserManager.tsx`
- `src/components/admin/UserRolesRow.tsx`
- `src/pages/BrokerPanel.tsx`
- `src/components/AppLayout.tsx`
- `src/main.tsx` (envolver con `ImpersonationProvider`)
- Páginas de paciente para respetar `actingAsPatientId`

## Resultado esperado

- Admin asigna broker a paciente desde el grid o por CSV masivo.
- Broker entra a su panel, ve a sus pacientes, hace clic en "Actuar como" y puede crear pólizas, reclamos, citas, etc. en nombre del paciente, con un banner visible siempre que indica en nombre de quién está operando.


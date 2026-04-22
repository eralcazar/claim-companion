

## Objetivo (Fase 1)

Crear los 3 nuevos roles (`enfermero`, `laboratorio`, `farmacia`), un sistema de **acceso paciente↔personal** que reemplaza el patrón actual broker‑only, y los paneles correspondientes para cada perfil con vistas/filtros nuevos. Los módulos de **CFDI/Facturapi/Stripe/farmacia online** quedan planeados para Fase 2.

## 1. Base de datos

**Migración:**

- Extender enum `app_role` con `'enfermero'`, `'laboratorio'`, `'farmacia'`.
- Tabla `patient_personnel`:
  - `id uuid pk`, `patient_id uuid not null`, `personnel_id uuid not null`
  - `personnel_role app_role not null` (medico/enfermero/laboratorio/farmacia/broker)
  - `granted_by uuid not null` (admin o paciente)
  - `notes text`, `created_at timestamptz default now()`
  - `unique(patient_id, personnel_id, personnel_role)`
  - **RLS:**
    - Admin: full ALL.
    - Paciente: SELECT/INSERT/DELETE donde `auth.uid() = patient_id`.
    - Personal: SELECT donde `auth.uid() = personnel_id`.
- Función `has_patient_access(_personnel uuid, _patient uuid) returns boolean security definer` que devuelve true si hay fila en `patient_personnel` o si es broker asignado vía `broker_patients` o admin.
- Insertar permisos por defecto en `role_permissions` para los 3 nuevos roles (acceso a `inicio`, `perfil`, sus respectivos paneles).
- Agregar columnas a `medicos`: `nombre_consultorio text`, `direccion_consultorio_calle/numero/colonia/cp/municipio/estado text`, `email_consultorio text`, `horario_atencion text`, `foto_path text` (en bucket `medicos/`).
- Agregar columna `formularios.es_informe_medico boolean default false` para marcar el formato de informe médico por aseguradora.
- Agregar columna `claim_documents.tipo_documento text` (`receta` | `informe_medico` | `factura` | `otro`) para identificar adjuntos.

**Ampliar RLS de tablas clínicas** para que **todo personal con acceso** (no solo médico/broker) pueda leer:
- `appointments`, `recetas`/`receta_items`, `estudios_solicitados`/`estudio_items`/`resultados_estudios`/`indicadores_estudio`, `medications`, `medical_records`: añadir policy SELECT `using (has_patient_access(auth.uid(), <patient_id>))`.
- Mantener policies de escritura existentes; agregar UPDATE/INSERT específicas por rol donde aplique (laboratorio inserta `resultados_estudios`, farmacia marca `recetas` como surtida, enfermero registra observaciones).

## 2. Frontend — features y permisos

`src/lib/features.ts`:
- Agregar `FeatureKey`: `nurse_panel`, `lab_panel`, `pharmacy_panel`, `patient_personnel_manager`, `patient_view`.
- `ALL_ROLES` añade `enfermero`, `laboratorio`, `farmacia`.
- Nuevas entradas en `AVAILABLE_FEATURES` con sus rutas y grupos.

`AppSidebar.tsx`: secciones nuevas (Enfermería, Laboratorio, Farmacia) con sus items.

`AccessManager` ya muestra todo desde DB → automáticamente listará los nuevos roles/features.

## 3. Sección "Acceso Paciente vs Personal"

**Componente reutilizable** `src/components/personnel/PatientPersonnelManager.tsx`:
- Props: `mode: "patient" | "admin"`, `patientId?: string`.
- En modo `patient`: muestra solo los vínculos del paciente logueado; botón **"+ Dar acceso"** abre dialog con:
  - Select **Tipo de personal**: Médico / Enfermero / Laboratorio / Farmacia / Broker / Todos.
  - Select **Personal asignado**: combobox con búsqueda que carga `profiles` filtrados por `user_roles.role = tipo` (consulta `useQuery`).
  - Notas opcionales.
- En modo `admin`: tabla maestra con filtros (paciente, tipo de personal, personal); CRUD completo.

**Nueva página `/perfil/accesos`** (paciente) y **`/admin/accesos-pacientes`** (admin) que renderizan el componente.

Hook `src/hooks/usePatientPersonnel.ts` con `useMyAccesses()`, `useAllAccesses()` (admin), `useGrantAccess()`, `useRevokeAccess()`, `useAssignedPatients(role?)` (para paneles de personal).

## 4. Panel Médico — extensiones

`src/pages/DoctorPanel.tsx`:
- **Nuevo tab "Mis pacientes"** además de "Agenda": grid de pacientes desde `useAssignedPatients('medico')` con buscador y filtros (nombre, última cita, próxima cita).
- En el tab Agenda: agregar filtro **"Sin receta"** que excluye citas que tengan al menos una `recetas` con `appointment_id = apt.id` o un `claim_documents`/`appointment_documents` con `tipo_documento='receta'`.
- **Nueva ruta `/medico/reclamos-sin-informe`**: lista `claim_forms` del médico (vía `appointments → claims`/`claim_forms` que falten un doc tipo `informe_medico`) y muestra para cada uno **botón "Descargar formato"** que toma el `formularios` con `es_informe_medico=true` y `aseguradora_id` correspondiente del bucket `formatos`.
- **Nueva ruta `/medico/paciente/:id`** — vista detalle del paciente (master-detail) con tabs: Agenda · Recetas · Estudios · Tendencias · Registros médicos · Medicamentos. Cada tab reusa los componentes existentes pero con `patientId` forzado y respeta `has_patient_access` por RLS.

## 5. Panel Enfermero (`/enfermeria`)

`src/pages/NursePanel.tsx`:
- Header + grid de pacientes desde `useAssignedPatients('enfermero')`.
- Click → reusa la misma vista master-detail `/personal/paciente/:id` (compartida) con tabs Agenda/Recetas/Estudios/Tendencias/Registros.
- Permisos: lectura completa, escritura en `medications` (registrar tomas) y `medical_records` (notas de enfermería).

## 6. Panel Laboratorio (`/laboratorio`)

`src/pages/LabPanel.tsx`:
- Grid pacientes con vínculo lab → al hacer click va a `/laboratorio/paciente/:id` que muestra:
  - Lista de `estudios_solicitados` del paciente (filtro: pendientes/en proceso/completados).
  - Botón **"Capturar resultados"** que reusa `ResultadosManager` ya existente.
  - Subida de archivos al bucket `estudios-resultados`.

## 7. Panel Farmacia (`/farmacia`)

`src/pages/PharmacyPanel.tsx`:
- Lista de pacientes con vínculo farmacia.
- Click → ver todas las `recetas` del paciente con `receta_items` y estado (vigente, surtida, vencida).
- Botón **"Marcar surtida"** (UPDATE en `recetas.estado`).
- **Placeholder Fase 2**: card "Venta en línea de medicamentos — próximamente" (se planea con Stripe).

## 8. Panel Broker — refuerzo del "actuar como"

`src/pages/BrokerPanel.tsx` ya tiene grid + impersonación. Cambios:
- Agregar tab/botón **"Ver detalle"** además de "Actuar como" → abre `/personal/paciente/:id` (la misma vista master-detail) sin tomar identidad.
- Validar que el modo "actuar como" funciona para crear reclamos (revisar `useEffectiveUserId` ya está integrado en `Claims.tsx`/`NewClaim.tsx`).

## 9. Vista master-detail compartida

`src/pages/PatientView.tsx` en ruta `/personal/paciente/:id` (autorizada para cualquier rol con `has_patient_access`):
- Header con datos del paciente.
- Tabs: Agenda / Recetas / Estudios / Tendencias / Registros médicos / Medicamentos / Pólizas (solo broker/admin).
- Reutiliza `EstudioCard`, `RecetaCard`, `IndicadorTrendChart`, etc., pasando `patientId` por props o filtros del hook.

## 10. Datos consultorio + foto del médico

`src/components/medicos/MedicoEditor.tsx`:
- Nueva sección "Consultorio" con campos: Nombre del consultorio, dirección completa (calle, número, colonia, CP, municipio, estado), email del consultorio, horario de atención, **foto** (upload a `medicos/<userid>/foto.jpg`).
- Hook `useUpsertMedico` extendido para incluir los nuevos campos.

## 11. Gestor de Formatos — checkbox "Informe médico"

`src/components/admin/FormHeader.tsx` o `InfoTab` en `FormatManager.tsx`:
- Agregar checkbox **"Es formato de Informe Médico"**. Al guardar, `formularios.es_informe_medico=true`. Solo uno por aseguradora (validación cliente/server).
- Esa marca alimenta la vista "Reclamos sin informe médico" del Panel Médico (paso 4).

## 12. Rutas (`src/App.tsx`)

```
/perfil/accesos                    → paciente gestiona sus accesos
/admin/accesos-pacientes           → admin matriz completa
/enfermeria                        → NursePanel
/laboratorio                       → LabPanel
/laboratorio/paciente/:id          → LabPatientDetail
/farmacia                          → PharmacyPanel
/medico/reclamos-sin-informe       → ClaimsWithoutReport
/personal/paciente/:id             → PatientView (compartido)
```

Todas envueltas en `<ProtectedRoute>` con guard de `has_patient_access` cuando aplique.

## Archivos

**Migraciones SQL:**
- Extender `app_role` enum.
- Tabla `patient_personnel` + RLS.
- Función `has_patient_access`.
- Columnas nuevas en `medicos`, `formularios`, `claim_documents`.
- Policies SELECT adicionales en tablas clínicas.

**Insert tool:** seed `role_permissions` para enfermero/laboratorio/farmacia.

**Creados:**
- `src/components/personnel/PatientPersonnelManager.tsx`
- `src/components/personnel/PersonnelSelect.tsx`
- `src/hooks/usePatientPersonnel.ts`
- `src/hooks/useAssignedPatients.ts`
- `src/pages/PatientPersonnelPage.tsx` (+ versión admin)
- `src/pages/NursePanel.tsx`, `src/pages/LabPanel.tsx`, `src/pages/PharmacyPanel.tsx`
- `src/pages/PatientView.tsx`
- `src/pages/medico/ClaimsWithoutReport.tsx`
- `src/pages/medico/DoctorPatients.tsx` (tab "Mis pacientes")

**Modificados:**
- `src/lib/features.ts`, `src/components/AppSidebar.tsx`, `src/App.tsx`
- `src/pages/DoctorPanel.tsx` (filtro "Sin receta", tabs, link a vista detalle)
- `src/pages/BrokerPanel.tsx` (botón "Ver detalle")
- `src/pages/Profile.tsx` (link "Mis accesos")
- `src/pages/admin/FormatManager.tsx` (checkbox "Informe médico")
- `src/components/medicos/MedicoEditor.tsx` (consultorio + foto)
- `src/hooks/useMedicos.ts` (nuevos campos)

## Resultado esperado (Fase 1)

Admin abre `/admin/accesos-pacientes` → asigna a María (paciente) un médico, una enfermera y un laboratorio. María entra a `/perfil/accesos` y agrega además a su farmacia. La enfermera entra a `/enfermeria` → ve a María en su grid → click → ve su agenda, recetas, estudios, tendencias, registros y puede registrar notas. El laboratorio ve los estudios solicitados de María y captura resultados. La farmacia ve sus recetas activas y las marca como surtidas. El médico filtra su agenda por "Sin receta" y atiende esos casos primero; en `/medico/reclamos-sin-informe` ve los reclamos de sus pacientes que aún no tienen informe médico subido y descarga el formato del informe correspondiente a la aseguradora del reclamo. En su perfil de médico subió foto y datos del consultorio. **Fase 2 (siguiente plan)**: CFDI vía Facturapi, ventas farmacia con Stripe, módulo de facturación automática.


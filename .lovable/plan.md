

## Acceso directo a Consultorio digital desde /medico

Hoy el `BodyMapEditor` solo se abre por cita (`/consultorio/:appointmentId`). Voy a agregar un acceso directo en `/medico` que permita explorar el mapa corporal de cualquier paciente asignado sin pasar por una cita específica.

### Cambios

**1. Nueva ruta `/consultorio` (sin appointmentId)**
- Modo "exploración libre": el doctor elige paciente de su lista de asignados y se abre el mapa corporal histórico de ese paciente, editable.
- Las anotaciones creadas acá quedan asociadas al paciente pero sin `appointment_id` (campo ya nullable en la tabla).

**2. `src/pages/Consultorio.tsx`**
- Soportar dos modos según `useParams`:
  - Con `appointmentId`: comportamiento actual (consulta en curso).
  - Sin `appointmentId`: muestra selector de paciente arriba (`Select` con pacientes asignados vía `useAssignedPatients("medico")`), y al elegir uno renderiza solo la columna del paciente + `BodyMapEditor` con `patientId` y `canEdit=true`.

**3. `src/pages/DoctorPanel.tsx`**
- Botón nuevo arriba del panel, al lado del título: **"Consultorio digital"** (icono `Stethoscope`) que navega a `/consultorio`.
- Visible siempre, no depende de tener citas.

**4. `src/App.tsx`**
- Registrar `<Route path="/consultorio" element={<Consultorio />} />` (sin parámetro), antes de la ruta con `:appointmentId`.

**5. `src/lib/features.ts` + `src/components/AppSidebar.tsx`**
- Asegurar que `consultorio` apunte a `/consultorio` (ruta base) para que también aparezca en el sidebar del médico.

### Lo que NO cambia
- Esquema DB: `appointment_id` ya es nullable en `body_annotations`.
- Permisos RLS: ya permiten al médico crear anotaciones por `patient_id` sin cita.
- El flujo dentro de una cita sigue idéntico.


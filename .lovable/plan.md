

## Objetivo

Permitir editar una cita existente desde la agenda (fecha, tipo, médico, dirección, recordatorio y notas).

## Cambios

### 1. `AppointmentDetailDialog.tsx` — agregar botón "Editar"

- Añadir botón **Editar** en el header del diálogo (junto al título).
- Al hacer click, cierra el detalle y abre el formulario de edición precargado con los datos de la cita.
- Solo visible para el dueño de la cita (`appointment.user_id === user.id`) o admin. El médico no edita la cita en sí, solo gestiona documentos.

### 2. `Appointments.tsx` — reutilizar el formulario para crear y editar

- Refactorizar el `Dialog` actual de "Nueva Cita" para que sirva también como "Editar Cita":
  - Estado nuevo: `editingId: string | null`. Si está set, el diálogo opera en modo edición.
  - Título dinámico: "Nueva Cita" / "Editar Cita".
  - Botón principal: "Guardar" / "Actualizar".
- Nueva mutación `updateMutation`:
  - `supabase.from("appointments").update(payload).eq("id", editingId)`.
  - Mismo payload que `createMutation` (médico, dirección, lat/lng, recordatorio, notas, fecha, tipo).
  - Si cambia `reminder_enabled` o `reminder_minutes_before` o `appointment_date`, resetear `reminder_sent_at = null` para que el cron lo vuelva a mandar.
  - Invalida `["appointments"]` y cierra el diálogo.
- Función `openEdit(apt)` que precarga el `form` desde la cita (incluye `doctor_id` o `MANUAL_DOCTOR` si tiene `doctor_name_manual`) y abre el diálogo.
- Pasar `onEdit` callback a `AppointmentDetailDialog` para que pueda disparar la edición desde el detalle.

### 3. Acceso al editor

- Desde el `AppointmentDetailDialog`: botón "Editar" en el header.
- Opcional: en cada card de la lista de "Próximas", agregar un icono `Pencil` junto al icono de borrar (sin propagar el click para que no abra el detalle).

### 4. Detalles técnicos

- Las citas pasadas no se pueden editar (botón oculto si `appointment_date < now`).
- Validación: si la nueva fecha está en el pasado, mostrar warning pero permitir guardar (admin puede registrar histórico).
- Reset del formulario al cerrar el diálogo (limpiar `editingId`).

### 5. Archivos a tocar

- `src/pages/Appointments.tsx` — modo dual crear/editar, `updateMutation`, `openEdit`, botón ✏️ en cards.
- `src/components/appointments/AppointmentDetailDialog.tsx` — botón Editar en header + prop `onEdit`.

## Resultado esperado

Desde la agenda, el paciente puede tocar el icono de lápiz en una cita o abrir el detalle y pulsar "Editar". El mismo formulario aparece con los datos cargados; al guardar, la cita se actualiza y, si cambió algo del recordatorio, se reactivará el envío.


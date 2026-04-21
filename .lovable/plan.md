

## Objetivo

Mejorar el flujo de agenda con: médico asignado (lista o manual), dirección con autocompletado, recordatorios configurables, y gestión de documentos por cita desde el panel del médico.

## Cambios

### 1. Migración de base de datos

**Tabla `appointments` — agregar columnas:**
- `doctor_name_manual text` — nombre escrito a mano cuando el médico no está registrado
- `address text` — dirección formateada de la consulta
- `address_lat double precision`, `address_lng double precision` — coordenadas
- `reminder_enabled boolean default false`
- `reminder_minutes_before integer` — 15, 30, 60, 120, 1440 (1 día)
- `reminder_sent_at timestamptz` — para no duplicar envíos

**Nueva tabla `appointment_documents`:**
- `id`, `appointment_id`, `uploaded_by`, `file_path`, `file_name`, `file_type` (mime), `document_category` (enum: receta, estudio, notas_medicas, cfdi, impresion_cfdi, otro), `created_at`
- RLS: SELECT/INSERT/DELETE para el dueño de la cita (`user_id`), el médico asignado (`doctor_id`) y admins. Brokers asignados al paciente también acceden.

**Nuevo bucket `appointment-docs`** (privado) con políticas storage por `appointment_id` en el path.

**Nueva tabla `notifications`** (in-app):
- `id`, `user_id`, `title`, `body`, `link`, `read_at`, `created_at`
- RLS: usuario ve y marca como leídas las suyas.

### 2. Nueva cita (`Appointments.tsx`) — campos añadidos

- **Médico asignado**: Select que lista usuarios con rol `medico` (consultando `user_roles` + `profiles`). Opción "Otro / no listado" → muestra Input para `doctor_name_manual`.
- **Dirección de la consulta**: Input con autocompletado vía **Nominatim (OpenStreetMap, gratis, sin API key)**. Al elegir una sugerencia se guarda la dirección formateada + lat/lng. Botón "Abrir en Google Maps" usando `https://www.google.com/maps/search/?api=1&query=lat,lng`.
- **Recordatorio**: Switch "Activar recordatorio" + Select de tiempo (15 min, 30 min, 1 h, 2 h, 1 día antes).
- Mantener: fecha/hora, tipo, notas.

### 3. Sistema de recordatorios

- **Edge function `send-appointment-reminders`** corriendo cada 5 min vía pg_cron:
  - Busca citas con `reminder_enabled=true`, `reminder_sent_at IS NULL`, donde `now() >= appointment_date - reminder_minutes_before`.
  - Inserta una fila en `notifications` para el paciente.
  - Marca `reminder_sent_at = now()`.
- **Componente `NotificationBell`** en `AppLayout` (campanita en header):
  - Badge con conteo de no leídas.
  - Popover lista las últimas 10. Click marca como leída.
  - Suscripción realtime a `notifications` para mostrar toast cuando llegue una nueva.

(Email/SMS quedan para una iteración posterior — el sistema de notificaciones in-app ya cubre la alerta al usuario sin requerir API keys ni costos.)

### 4. Panel del médico (`DoctorPanel.tsx`)

- Reescribir query a dos pasos (sin FK hint roto): traer citas por `doctor_id`, luego perfiles con `.in('user_id', ids)`.
- Cada card de cita ahora abre un **diálogo de detalle** con:
  - Datos del paciente, fecha, dirección.
  - Sección "Documentos": lista de archivos cargados con miniatura/icono por tipo, badge de categoría, botón descargar y borrar (con confirmación).
  - Botón "Subir documento" → modal con: Select de categoría obligatorio (Receta, Estudio, Notas médicas, CFDI, Impresión CFDI, Otro) + input de archivo (`accept=".pdf,image/*,.xml"`). Sube de uno en uno.
- El paciente también ve los documentos de su cita desde su agenda (solo lectura para los subidos por el médico; puede borrar los suyos).

### 5. Archivos

**Nuevos:**
- `supabase/functions/send-appointment-reminders/index.ts`
- `src/components/appointments/AddressAutocomplete.tsx` — input + lista de sugerencias Nominatim con debounce
- `src/components/appointments/AppointmentDocuments.tsx` — lista + subir + borrar
- `src/components/appointments/AppointmentDetailDialog.tsx` — vista de detalle compartida
- `src/components/NotificationBell.tsx`
- `src/hooks/useDoctors.ts` — lista usuarios con rol médico
- `src/hooks/useNotifications.ts`

**Modificados:**
- `src/pages/Appointments.tsx` — formulario ampliado, vista detalle
- `src/pages/DoctorPanel.tsx` — query corregida + abrir detalle con documentos
- `src/components/AppLayout.tsx` — agregar `NotificationBell`

### 6. Seguridad

- RLS estricta en `appointment_documents`: solo paciente, médico asignado, broker asignado y admin.
- Storage bucket privado, descargas vía signed URLs (1 h).
- Validación de tipo de archivo en cliente y tamaño máximo 20 MB.
- Edge function de recordatorios usa service role solo internamente.

## Resultado esperado

- Al crear una cita: eliges médico (de la lista o escribes el nombre), buscas la dirección con autocompletado, activas recordatorio y eliges cuánto antes.
- A la hora indicada, el paciente recibe una notificación dentro de la app (campanita + toast).
- En el Panel Médico, el médico ve sus citas, abre cada una y sube/borra documentos clasificados (PDF, imagen o XML) con la categoría correspondiente.


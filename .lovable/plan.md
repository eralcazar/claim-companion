

## Objetivo

1. Agregar un campo **"Observaciones del médico"** en cada cita, editable únicamente por el médico asignado desde el Panel Médico.
2. Agregar **filtros de fecha** en el Panel Médico: Hoy, Últimos 7 días, Último mes, y rango personalizado.

## Cambios

### 1. Migración de base de datos

**Tabla `appointments` — agregar columna:**
- `doctor_observations text` — observaciones que el médico escribe sobre la cita.

**Política RLS adicional:**
- Nueva política UPDATE para médico: `Doctors can update assigned appts observations` permite al médico (`auth.uid() = doctor_id`) hacer `UPDATE` solo sobre la columna `doctor_observations`. Como Postgres RLS no limita por columna, se implementa un **trigger BEFORE UPDATE** que:
  - Si el `auth.uid()` es el `doctor_id` y NO es admin ni el dueño, fuerza `NEW.* = OLD.*` en todas las columnas excepto `doctor_observations` y `updated_at`. Esto evita que el médico modifique fecha/dirección/etc. aunque la política UPDATE lo permita.
- El paciente y admin siguen pudiendo editar la cita pero **no** verán este campo en su formulario; sí lo ven en modo lectura en el detalle.

### 2. Panel Médico (`DoctorPanel.tsx`)

**Filtros de fecha (barra superior):**
- Tabs/Toggle group con opciones: **Próximas** (default — comportamiento actual), **Hoy**, **Últimos 7 días**, **Último mes**, **Rango personalizado**.
- Al elegir "Rango personalizado" se muestran dos `DatePicker` (desde / hasta) usando shadcn Calendar dentro de Popover (`pointer-events-auto`).
- La query usa el filtro elegido para construir el `gte`/`lte` sobre `appointment_date`. Para "Hoy/7 días/Mes" incluye también citas pasadas dentro del rango (sin el `gte(now())` actual).
- Mostrar contador de resultados.

**Edición de observaciones:**
- Al hacer click en una card de cita se abre `AppointmentDetailDialog` (ya existe). 
- Pasar nueva prop `canEditDoctorObservations={true}` cuando el usuario actual es el `doctor_id`.
- El diálogo mostrará una sección **"Observaciones del médico"**:
  - Si `canEditDoctorObservations`: `Textarea` editable + botón **Guardar observaciones** que hace `update` y muestra toast.
  - Si no: solo lectura (texto plano o "Sin observaciones").

### 3. Vista paciente (`Appointments.tsx`)

- En el detalle, mostrar las observaciones del médico (read-only) si existen, con un encabezado claro "Observaciones del médico".
- El formulario de crear/editar del paciente **no** incluye este campo.

### 4. Archivos a tocar

**Modificados:**
- `supabase/migrations/...` — nueva migración: columna + trigger + política RLS.
- `src/components/appointments/AppointmentDetailDialog.tsx` — sección de observaciones (lectura/edición), mutación de guardado.
- `src/pages/DoctorPanel.tsx` — barra de filtros, query dinámica, pasar `canEditDoctorObservations`.

**Sin cambios funcionales:**
- `src/pages/Appointments.tsx` — el detalle ya consume `AppointmentDetailDialog`, hereda la sección de observaciones automáticamente en modo lectura.

### 5. Detalles técnicos

- **Filtros de fecha** se calculan en cliente con `date-fns`:
  - Hoy: `startOfDay(now)` → `endOfDay(now)`.
  - 7 días: `subDays(now, 7)` → `endOfDay(now)`.
  - 1 mes: `subMonths(now, 1)` → `endOfDay(now)`.
  - Rango: ambos pickers (con `endOfDay` en el "hasta").
  - Próximas: `gte(now)`, `order asc` (comportamiento actual).
- React Query: la `queryKey` incluye `[filterMode, fromDate, toDate]` para refetch automático al cambiar filtro.
- Mutación de observaciones: `useMutation` que hace `update({ doctor_observations }).eq("id", apt.id)`, invalida `["doctor-appointments"]` y muestra toast.

## Resultado esperado

- En el Panel Médico aparecen tabs **Próximas / Hoy / 7 días / 1 mes / Rango**, con su selector de fechas si aplica.
- Al hacer click en cualquier cita, el médico puede escribir y guardar observaciones; nadie más puede modificarlas (gracias al trigger RLS).
- El paciente ve esas observaciones en modo lectura cuando abre el detalle de su cita.


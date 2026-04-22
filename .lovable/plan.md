

## Objetivo

Permitir que una **solicitud de estudios** contenga **varios tipos de estudio** (uno o más). Hoy cada fila en `estudios_solicitados` representa un solo estudio; vamos a separar la cabecera de solicitud de sus ítems de estudio, replicando el patrón ya aplicado a `recetas` / `receta_items`.

## Enfoque

Crear tabla hija `estudio_items` con los campos por estudio individual. La tabla `estudios_solicitados` queda como cabecera (paciente, médico, fecha, estado, indicación general, preparación general, laboratorio sugerido, observaciones, ayuno). Los campos de estudio existentes en la cabecera se mantienen por compatibilidad/migración pero la UI ya no los usa para detalle.

## Cambios

### 1. Migración SQL (schema)

Nueva tabla `public.estudio_items`:
- `id uuid pk default gen_random_uuid()`
- `estudio_id uuid not null references estudios_solicitados(id) on delete cascade`
- `orden int not null default 0`
- `tipo_estudio text not null`
- `descripcion text`
- `cantidad int not null default 1`
- `prioridad estudio_prioridad not null default 'normal'`
- `indicacion text` (opcional, por estudio)
- `created_at timestamptz default now()`
- Índice en `estudio_id`.

RLS en `estudio_items`: políticas espejo de `estudios_solicitados` (select/insert/update/delete) validando vía `EXISTS (select 1 from estudios_solicitados e where e.id = estudio_items.estudio_id and …)`. Mismas reglas: paciente ve los suyos, médico ve los que atiende, broker los asignados, admin todos.

Backfill: por cada solicitud existente copiar `(tipo_estudio, descripcion, cantidad, prioridad, indicacion)` como un `estudio_items` con `orden=0`.

`tipo_estudio` en `estudios_solicitados` se vuelve nullable para no romper compatibilidad (pero la UI ya no lo escribe en la cabecera).

### 2. Hooks (`src/hooks/useEstudios.ts`)

- `useEstudios(filters)`: cambiar `select` para traer `*, items:estudio_items(*)` y ordenar items por `orden`.
- `useCreateEstudio`: ahora recibe `{ ...header, items: [...] }`. Inserta cabecera, obtiene `id`, hace `insert` masivo en `estudio_items`. La notificación al paciente lista el primer estudio + "y N más" cuando aplica.
- `useUpdateEstudio`: si viene `items`, hace `delete from estudio_items where estudio_id = id` + `insert` masivo (estrategia replace). Si no, sólo actualiza cabecera.
- `useDeleteEstudio`: con `ON DELETE CASCADE` no requiere borrado previo.

### 3. Formulario `EstudioForm.tsx`

Reestructurar:
- Sección **Datos generales**: paciente, fecha (implícita), prioridad por defecto, ayuno + horas, laboratorio sugerido, preparación general, indicación general, observaciones, estado.
- Sección **Estudios solicitados** con array `items[]`:
  - Cada ítem: tarjeta colapsable "Estudio #N — {tipo}" con botón "Eliminar" (sólo si hay > 1).
  - Campos por ítem: `tipo_estudio` (Select con la lista `TIPOS`), `descripcion`, `cantidad` (default 1), `prioridad` (default 'normal'), `indicacion` específica.
  - Botón **"+ Agregar estudio"** al pie de la lista.
- Validación: al menos 1 ítem con `tipo_estudio` obligatorio.
- Al editar, hidratar `items` desde `initial.items` (o construir uno desde campos legacy si `items` está vacío).
- Submit envía `{ header, items }` a los hooks.
- Dialog crece a `max-w-3xl` con `overflow-y-auto`.

### 4. Tarjeta `EstudioCard.tsx`

- Título: "Solicitud de estudios · {fecha}" + badge de estado + badge de prioridad máxima.
- Mostrar lista compacta de estudios: por cada ítem `tipo (cantidad) · prioridad` (max 3 visibles + "y N más").
- Acciones (PDF, Resultados, Editar, Cancelar, Eliminar) sin cambios funcionales.
- Quitar dependencia directa de `estudio.tipo_estudio`; usar `estudio.items[]` con fallback a campos legacy si `items` viene vacío.

### 5. PDF `estudioPdf.ts`

- Cambiar firma para aceptar `estudio.items[]`.
- En `autoTable` generar **una fila por estudio** con columnas: `#`, `Tipo de estudio`, `Descripción`, `Cantidad`, `Prioridad`.
- Sección "Indicaciones" muestra la indicación general + listado por estudio si existen.
- Filename: `solicitud_estudios_{fecha}_{N}items.pdf`.

### 6. Página `Estudios.tsx`

- Búsqueda `q` ahora matchea contra cualquier `item.tipo_estudio` o `item.descripcion`.
- Resto sin cambios.

### 7. Integración con resultados

`ResultadosManager` y `resultados_estudios` siguen ligados a la cabecera `estudio_id` (no al ítem). Un resultado puede contener indicadores de cualquiera de los estudios de la solicitud, lo cual es coherente con el flujo real (laboratorio entrega un PDF por solicitud).

### 8. Integraciones existentes

`AppointmentDetailDialog.tsx` (tab Estudios) usa `useEstudios({ appointmentId })` y `EstudioForm`/`EstudioCard` → funciona automáticamente.

## Archivos

**Creados:**
- Migración SQL nueva en `supabase/migrations/` para `estudio_items` + RLS + backfill.

**Modificados:**
- `src/hooks/useEstudios.ts` — soportar items en CRUD.
- `src/components/estudios/EstudioForm.tsx` — UI de array de estudios.
- `src/components/estudios/EstudioCard.tsx` — render de múltiples ítems.
- `src/components/estudios/estudioPdf.ts` — tabla con N filas.
- `src/pages/Estudios.tsx` — búsqueda contra items.

## Resultado esperado

Médico abre "Nuevo estudio" → llena datos del paciente + ayuno/preparación generales → agrega "Química sanguínea" → click **"+ Agregar estudio"** → "Biometría hemática" → click otra vez para "Examen general de orina" → Guardar. La tarjeta muestra los 3 estudios; el PDF imprime una orden con tabla de 3 filas y la firma del médico al pie. Solicitudes existentes (un solo estudio) siguen mostrándose correctamente porque la migración las convierte en items.


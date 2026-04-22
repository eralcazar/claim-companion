

## Objetivo

Permitir que una **receta** contenga **varios medicamentos** (uno o más). Hoy cada fila en `recetas` representa un solo medicamento; vamos a separar la cabecera de receta de sus ítems de medicamento.

## Enfoque

Crear tabla hija `receta_items` con los campos por medicamento. La tabla `recetas` queda como cabecera (paciente, médico, fecha, estado, indicación/observaciones generales). Los campos de medicamento existentes en `recetas` se mantienen por compatibilidad/migración pero la UI ya no los usa.

## Cambios

### 1. Migración SQL (schema)

Nueva tabla `public.receta_items`:
- `id uuid pk default gen_random_uuid()`
- `receta_id uuid not null` → referencia lógica a `recetas.id` (ON DELETE CASCADE vía trigger o FK)
- `orden int not null default 0`
- `medicamento_nombre text not null`
- `marca_comercial text`
- `es_generico bool default false`
- `dosis numeric`, `unidad_dosis text`, `cantidad numeric`
- `via_administracion text`
- `frecuencia receta_frecuencia not null default 'cada_8h'`
- `frecuencia_horas int`
- `dias_a_tomar int`
- `precio_aproximado numeric`
- `indicacion text` (opcional, por medicamento)
- `created_at timestamptz default now()`

RLS en `receta_items`: políticas espejo de `recetas` (insert/update/delete/select), validando vía `EXISTS (select 1 from recetas r where r.id = receta_items.receta_id and ...)`. Mismas reglas: paciente ve los suyos, médico/admin/broker manejan según su acceso a la receta padre.

Migración de datos: por cada receta existente, copiar sus campos de medicamento como un `receta_items` con `orden=0`.

Los campos de medicamento en `recetas` se vuelven nullables (si no lo son) para no romper la compatibilidad, pero ya no se escriben.

### 2. Hooks (`src/hooks/useRecetas.ts`)

- `useRecetas(filters)`: cambiar el `select` para traer `*, items:receta_items(*)` y ordenar los items por `orden`.
- `useCreateReceta`: ahora recibe `{ ...header, items: [...] }`. Inserta en `recetas` (sin campos de medicamento), obtiene `id`, hace `insert` masivo en `receta_items` con `receta_id` asignado. La notificación al paciente lista el primer medicamento + "y N más" cuando aplica.
- `useUpdateReceta`: recibe `{ id, header_patch, items? }`. Si `items` viene, hace `delete from receta_items where receta_id = id` + `insert` masivo nuevo (estrategia replace, simple y robusta). Si no, sólo actualiza la cabecera.
- `useDeleteReceta`: agregar borrado previo de `receta_items` por `receta_id` antes de borrar la receta (si la FK no está en cascade).

### 3. Formulario `RecetaForm.tsx`

Reestructurar:
- Sección **Datos generales** (paciente, estado, indicación general, observaciones).
- Sección **Medicamentos** con array `items[]`:
  - Cada ítem: tarjeta colapsable con título "Medicamento #N — {nombre}" y botón "Eliminar" (sólo si hay > 1).
  - Campos por ítem: medicamento, marca, genérico, dosis/unidad, cantidad, vía, frecuencia (+frecuencia_horas si "otro"), días, precio, indicación específica.
  - Botón **"+ Agregar medicamento"** al pie de la lista.
- Validación: al menos 1 ítem con `medicamento_nombre` obligatorio; frecuencia "otro" requiere `frecuencia_horas`.
- Al editar (`initial`), hidratar `items` desde `initial.items` (o construir uno desde los campos legacy si `items` está vacío).
- Submit envía `{ header, items }` a los hooks.
- Dialog crece a `max-w-3xl` con `overflow-y-auto` para acomodar la lista.

### 4. Tarjeta `RecetaCard.tsx`

- Título de la card: "Receta · {fecha}" + badge de estado.
- Mostrar lista compacta de medicamentos: pill icon + `nombre — dosis × cantidad · frecuencia · N días` por cada ítem (max 3 visibles + "y N más" si excede).
- Acciones (PDF, Editar, Cancelar, Eliminar) sin cambios funcionales.
- Quitar dependencia de `receta.medicamento_nombre` en raíz; usar `receta.items[]` (con fallback al campo legacy si `items` viene vacío para recetas viejas).

### 5. PDF `recetaPdf.ts`

- Cambiar la firma para aceptar `receta.items[]`.
- En la tabla `autoTable`, generar **una fila por medicamento** con columnas: `#`, `Medicamento`, `Dosis`, `Cantidad`, `Vía`, `Frecuencia`, `Duración`.
- Sección "Indicaciones" muestra la indicación general de la receta + listado de indicaciones específicas por medicamento si existen.
- Filename: `receta_{fecha}_{N}meds.pdf`.

### 6. Página `Recetas.tsx`

- Búsqueda `q` ahora matchea contra cualquier `item.medicamento_nombre` o `item.marca_comercial`.
- Resto sin cambios.

### 7. Integraciones existentes

`AppointmentDetailDialog.tsx` (tab Recetas) usa `useRecetas({ appointmentId })` y `RecetaForm`/`RecetaCard` → funciona automáticamente con los cambios anteriores.

## Archivos

**Creados:**
- Migración SQL nueva en `supabase/migrations/` para `receta_items` + RLS + data backfill.

**Modificados:**
- `src/hooks/useRecetas.ts` — soportar items en CRUD.
- `src/components/recetas/RecetaForm.tsx` — UI de array de medicamentos.
- `src/components/recetas/RecetaCard.tsx` — render de múltiples ítems.
- `src/components/recetas/recetaPdf.ts` — tabla con N filas.
- `src/pages/Recetas.tsx` — búsqueda contra items.

## Resultado esperado

Médico abre "Nueva receta" → llena datos del paciente → agrega "Paracetamol 500mg c/8h × 5 días" → click **"+ Agregar medicamento"** → llena "Ibuprofeno 400mg c/12h × 3 días" → click **"+ Agregar medicamento"** otra vez para "Omeprazol 20mg c/24h × 7 días" → Guardar. La tarjeta muestra los 3 medicamentos en lista; el PDF incluye una tabla con 3 filas y la firma del médico al pie. Recetas existentes (un solo medicamento) siguen mostrándose correctamente porque la migración las convierte en items.


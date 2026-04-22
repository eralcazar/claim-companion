

## Objetivo

Agregar edición manual inline de indicadores dentro de `ResultadosManager`: cada fila podrá cambiar a modo edición para modificar **nombre**, **valor**, **unidad**, **rango de referencia (min/max)**, recalculando automáticamente el flag de "normal/fuera de rango" al guardar.

## Cambios

### 1. Componente nuevo: `IndicadorEditRow`

Archivo: `src/components/estudios/IndicadorEditRow.tsx`.

- Props: `indicador`, `onSave(patch)`, `onCancel()`, `isSaving`.
- Renderiza un grid responsive con inputs:
  - Nombre del indicador (text)
  - Valor (number, step 0.01)
  - Unidad (text)
  - Min de referencia (number, opcional)
  - Max de referencia (number, opcional)
- Botones: ✓ Guardar / ✕ Cancelar.
- Validación local: `nombre_indicador` no vacío; si `valor`, `min` y `max` son numéricos, `min <= max`. Toast de error si inválido.
- Al guardar, calcula `es_normal` y `flagged`:
  - Si `valor != null && min != null && max != null`: `es_normal = valor >= min && valor <= max`, `flagged = !es_normal`.
  - Si falta alguno: `es_normal = null`, `flagged = false`.

### 2. Modificar `ResultadosManager.tsx` → `ResultadoItem`

- Añadir state local `editingId: string | null`.
- En el `map` de indicadores, si `i.id === editingId` renderiza `<IndicadorEditRow>`; si no, renderiza la fila actual de visualización.
- Añadir botón **lápiz (Pencil)** junto al botón de basura cuando `canManage`, que setea `editingId = i.id`.
- `onSave` llama a `useSaveIndicador()` con `{ id: i.id, ...patch, es_normal, flagged }`. Al éxito, `setEditingId(null)`.
- `onCancel` solo cierra el modo edición.
- Mientras `editingId !== null`, el sparkline y los badges de normal/fuera de rango quedan ocultos (la fila se reemplaza por el editor).

### 3. Detalles UX

- Solo visible si `canManage` (médico/admin/broker) — pacientes siguen viendo modo lectura.
- Edición inline (no modal) para mantener contexto del resultado.
- Al guardar exitosamente, React Query refresca `["indicadores", resultado_id]` y la sparkline se actualiza automáticamente (porque `useIndicadorHistory` también se re-fetcha al invalidar).
- Atajo de teclado: Enter en cualquier input dispara guardar; Escape cancela.
- Tooltip en el botón lápiz: "Editar indicador".

### 4. Hook `useSaveIndicador` (sin cambios)

Ya soporta update via `if (input.id) { update }` — se reutiliza tal cual.

## Archivos a tocar

**Creados:**
- `src/components/estudios/IndicadorEditRow.tsx`

**Modificados:**
- `src/components/estudios/ResultadosManager.tsx` — añadir botón Pencil, state `editingId`, render condicional de edit row.

## Resultado esperado

Médico abre "Ver indicadores" en un resultado → cada fila muestra un ícono de lápiz junto a la basura → click en lápiz convierte la fila en formulario inline con 5 inputs (nombre, valor, unidad, min, max) y botones Guardar/Cancelar → al guardar, el flag "Normal/Fuera de rango" se recalcula automáticamente, la fila vuelve a modo lectura y el sparkline refleja el nuevo valor histórico. Funciona tanto para indicadores extraídos por IA como para los agregados manualmente.


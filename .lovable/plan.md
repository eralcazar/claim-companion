

## Objetivo

Dos mejoras en `ResultadosManager`:

1. **Editar metadata del resultado**: permitir cambiar el nombre del estudio (`pdf_name`), fecha del resultado (`fecha_resultado`), laboratorio (`laboratorio_nombre`) y notas, vía un dialog de edición.
2. **Botón explícito "Agregar indicador"**: convertir el formulario inline (que hoy aparece siempre al pie de la lista) en un formulario que sólo se muestra al pulsar un botón **"+ Agregar indicador"**, con botones Guardar/Cancelar.

## Cambios

### 1. Hook nuevo: `useUpdateResultado`

En `src/hooks/useResultadosEstudio.ts`:

```ts
export function useUpdateResultado() { ... }
```
- Recibe `{ id, patch: { pdf_name?, fecha_resultado?, laboratorio_nombre?, notas? } }`.
- Hace `supabase.from("resultados_estudios").update(patch).eq("id", id)`.
- Invalida `["resultados"]` y muestra toast.

Nota: el `pdf_name` es sólo el nombre mostrado/etiqueta del estudio. **No** se renombra el archivo en Storage (eso requeriría copy+delete y romperia el `pdf_path`). Se cambia únicamente la etiqueta visible.

### 2. Componente nuevo: `ResultadoEditDialog`

Archivo: `src/components/estudios/ResultadoEditDialog.tsx`.

- Props: `open`, `onOpenChange`, `resultado`.
- Dialog con campos:
  - **Nombre del estudio** (`pdf_name`, text, requerido).
  - **Fecha del resultado** (`fecha_resultado`, date).
  - **Laboratorio** (`laboratorio_nombre`, text).
  - **Notas** (`notas`, textarea).
- Hidrata estado desde `resultado` cuando `open` cambia.
- Botones Cancelar / Guardar; al guardar llama `useUpdateResultado.mutateAsync` y cierra.

### 3. Modificar `ResultadoItem` en `ResultadosManager.tsx`

#### 3a. Header del resultado: botón Editar

- Añadir botón con ícono `Pencil` en el grupo de acciones del header (entre Download y Trash) cuando `canManage`.
- Estado local `editOpen: boolean`; click abre el `ResultadoEditDialog`.
- El nombre del estudio (`resultado.pdf_name`) sigue mostrándose como título.

#### 3b. Botón "Agregar indicador"

- Reemplazar el grid inline siempre-visible por:
  - Estado `addingIndicador: boolean` (default `false`).
  - Cuando `addingIndicador === false`: mostrar botón **`+ Agregar indicador manual`** (variant `outline`, size `sm`, ícono `Plus`).
  - Cuando `addingIndicador === true`: mostrar el grid actual de 5 inputs (`nombre`, `valor`, `unidad`, `min`, `max`) + dos botones: **Guardar** (verde, llama `addIndicador` y al terminar setea `addingIndicador=false`) y **Cancelar** (limpia draft y cierra).
- Validación mínima: `nombre_indicador` requerido (toast de error si vacío). Toast de éxito tras guardar.
- El cálculo de `es_normal`/`flagged` se mantiene exactamente como hoy.

### 4. Detalles UX

- El botón "Agregar indicador" sólo se muestra si `canManage` y `showInd === true` (ya estaban abiertos los indicadores).
- El dialog de edición de resultado reutiliza componentes `Dialog`, `Input`, `Label`, `Textarea` existentes.
- Atajo de teclado en el form de agregar indicador: `Enter` en cualquier input dispara Guardar; `Escape` cancela.
- Tooltip en el botón Pencil del header: "Editar datos del resultado".
- En móvil (viewport actual ~984px), los botones se acomodan con el `flex-wrap` ya existente.

## Archivos

**Creados:**
- `src/components/estudios/ResultadoEditDialog.tsx`

**Modificados:**
- `src/hooks/useResultadosEstudio.ts` — nuevo `useUpdateResultado`.
- `src/components/estudios/ResultadosManager.tsx` — botón Pencil + dialog en header del resultado; reemplazar grid inline por botón "Agregar indicador" con form colapsable.

## Resultado esperado

**Editar resultado**: usuario hace click en el ícono de lápiz junto al nombre del PDF → abre dialog con 4 campos pre-llenados → modifica nombre del estudio (ej. "Hemograma completo") + fecha + lab + notas → Guardar → la tarjeta del resultado se actualiza inmediatamente.

**Agregar indicador**: usuario abre "Ver indicadores" → debajo de la lista aparece botón **"+ Agregar indicador manual"** → click muestra el formulario de 5 campos con Guardar/Cancelar → al guardar el indicador aparece en la lista, el form se cierra y queda listo para agregar otro pulsando el botón nuevamente.


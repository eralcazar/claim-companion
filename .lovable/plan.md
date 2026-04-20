

El usuario quiere que las coordenadas X%, Y%, W%, H% aparezcan en columnas separadas (no solo en el badge "Coords") y que sean editables inline en la tabla.

Reviso `FieldsTable.tsx` actual para entender qué hay.
<lov-tool-use id="toolu_vrtx_01BTZiDhMpbU6DLiFp3Ys8FT" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/admin/FieldsTable.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JLgDiGpyxCXmCx4CtG8ocD" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/admin/FieldsTable.tsx\"}">
</lov-tool-use>
I have what I need. The X% Y% W% H% columns already exist in the header (lines 333-336) but are at the far right of a wide table. The user wants them visible and editable. Let me check the body section briefly to see if those input cells exist.
<lov-tool-use id="toolu_vrtx_01UpWKbH1vuVCZ8FDz1ynLm7" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/admin/FieldsTable.tsx\", \"lines\": \"469-600\"}">
</lov-tool-use>
Now I understand the situation. The X%/Y%/W%/H% columns AND inputs already exist (lines 333-336 headers, 527-562 editable inputs), but they're at the far right of a very wide table (18 columns), so on a 984px viewport they're hidden behind horizontal scroll. The user wants them visible without scrolling.

<lov-plan>

## Diagnóstico

Las columnas **X%, Y%, W%, H%** ya existen en `FieldsTable.tsx` y ya son editables (inputs numéricos en líneas 527–562). El problema es de **visibilidad**: la tabla tiene 18 columnas y esas 4 quedan a la derecha del todo, ocultas tras el scroll horizontal en un viewport de 984px.

Además, hoy hay duplicación visual:
- una columna compacta **"Coords"** con un badge (✓ X,Y / Sin coords)
- y al final las 4 columnas editables **X% Y% W% H%**

Eso ocupa el doble de espacio y empuja los inputs editables fuera de la vista.

## Plan

### 1. Reordenar columnas en `FieldsTable.tsx`
Mover las 4 columnas editables `X% Y% W% H%` justo después de la columna **Pág**, en el lado izquierdo de la tabla. Así quedan visibles sin scroll en 984px.

Nuevo orden propuesto:
`☐ · # · Clave · Etiqueta · Tipo · Pág · X% · Y% · W% · H% · Sección · Catálogo · Campo de mapeo · Valor mapeado · Req · Estado · 🗑`

### 2. Eliminar la columna redundante "Coords"
El badge resumen ya no aporta porque los 4 inputs están visibles e indican el estado por sí mismos (vacío = sin coords). Quitar header y celda.

### 3. Ajustar anchos para que entren bien
- `X% Y% W% H%`: `w-16` (64px) cada una con input compacto `h-8 text-xs px-1`
- `Pág`: mantener `w-14`
- Mantener `overflow-x-auto` por seguridad en pantallas muy chicas

### 4. Pequeñas mejoras de UX en los inputs de coordenadas
- Resaltar visualmente cuando una fila tiene coordenadas completas vs incompletas (borde sutil del grupo de 4 inputs)
- Placeholder `—` cuando estén vacías
- Mantener `step="0.01"` y el commit en `onChange` que ya existe

### 5. Actualizar `colSpan` del estado vacío
Las filas "Cargando…" y "Sin campos" usan `colSpan={17}`. Tras eliminar "Coords" quedan 17 columnas igualmente (18 − 1 Coords = 17), así que el `colSpan` sigue válido. Verificar y dejar consistente.

## Archivos a tocar
- `src/components/admin/FieldsTable.tsx` (único archivo; solo reordenar columnas, quitar "Coords", ajustar anchos)

Sin migraciones. Sin cambios de lógica de guardado: los inputs editables y `update(id, { campo_x, ... })` ya funcionan, solo dejarán de estar escondidos.

## Resultado esperado
En el tab **Campos**, sin necesidad de scroll horizontal, verás 4 columnas editables `X% Y% W% H%` justo al lado de **Pág**, ya con los valores que vengan de la detección automática o del CSV, y podrás editarlas inline.


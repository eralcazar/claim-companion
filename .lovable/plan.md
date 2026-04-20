

## Cambios solicitados

1. **SectionsList**: hacer evidentes los botones "Modificar" y "Eliminar" por fila (hoy son íconos sin texto y se confunden).
2. **FieldsTable**: separar el mapeo en dos columnas claras — **Catálogo de mapeo** (perfil/póliza/siniestro/médico) y **Campo de mapeo** (listbox con los campos del catálogo seleccionado).
3. **FieldsTable**: hacer editable la columna **Estado** (Mapeado / Manual) usando la columna `origen` de la BD.

---

## 1. SectionsList — botones explícitos

En `src/components/admin/SectionsList.tsx`, reemplazar la celda de acciones (líneas 175-194) para mostrar:
- Botón **"Modificar"** (variant `outline`, ícono `Save`, texto visible, sólo activo si `isDirty`).
- Botón **"Eliminar"** (variant `destructive`, ícono `Trash2`, texto visible).

Ampliar la columna de acciones a `w-44` para que los textos quepan.

---

## 2. FieldsTable — separar Catálogo y Campo de mapeo

**Cambios en `src/components/admin/FieldsTable.tsx`:**

- Reemplazar la única columna "Mapeo" (que usa `MappingSelects` apilando dos selects) por **dos columnas independientes**:
  - **Catálogo** (`w-32`): select con `Sin mapeo / Perfil / Póliza / Siniestro / Médico`. Al cambiar limpia los 4 ids `mapeo_*`.
  - **Campo de mapeo** (`min-w-[200px]`): select cuyas opciones provienen de `mapeos.{perfiles|polizas|siniestros|medicos}` según el catálogo elegido. Deshabilitado si no hay catálogo. Muestra `nombre_display` y como subtítulo `columna_origen`.
- Eliminar el componente `MappingSelects` de esta tabla (queda en uso para `MappingSuggestionsPanel` y `FieldSidebar`, no se borra el archivo).
- Mantener la columna **"Valor mapeado"** (preview con badge) tal cual.

Helpers nuevos dentro del componente:

```text
getCatalogo(c)        -> "perfil" | "poliza" | "siniestro" | "medico" | null
setCatalogo(c, t)     -> update con los 4 mapeo_* (sólo el elegido = "" hasta escoger campo, resto = null)
setCampoMapeo(c, id)  -> update del único mapeo_* correspondiente al catálogo activo
opcionesCatalogo(t)   -> mapeos.perfiles | polizas | siniestros | medicos
```

---

## 3. FieldsTable — columna Estado editable

Hoy la columna "Estado" muestra un badge derivado (`isMapped`). Cambiarla a un **Select editable** con dos opciones:
- `auto` → "⚡ Auto" (campo detectado por IA o con mapeo)
- `manual` → "○ Manual" (campo creado/editado a mano)

Persiste en la columna `campos.origen` (ya existe en la tabla, default `'auto'`). El cambio entra al `dirty` set y se guarda con el botón "Guardar".

Ajustar el ancho de la columna a `w-28`.

---

## Detalles técnicos

- Archivos editados:
  - `src/components/admin/FieldsTable.tsx` (estructura de columnas + handlers de catálogo/campo de mapeo + select de origen).
  - `src/components/admin/SectionsList.tsx` (botones con texto).
- Sin migraciones de BD: todos los campos ya existen (`mapeo_perfil`, `mapeo_poliza`, `mapeo_siniestro`, `mapeo_medico`, `origen`).
- Sin cambios en hooks: se sigue usando `useMapeos`, `useUpsertCampos`, `useUpsertSeccion`, etc.
- `colSpan` de filas vacías/cargando se actualiza de 15 → 16 por la columna extra.

---

## Diagrama de la tabla resultante

```text
[ ☐ ][ # ][ Clave ][ Etiqueta ][ Tipo ][ Pág ][ Sección ][ Catálogo ][ Campo de mapeo ][ Valor mapeado ][ X% ][ Y% ][ W% ][ H% ][ Req ][ Estado ▼ ][ 🗑 ]
```




El usuario quiere que las acciones de gestión de archivos (subir, nueva carpeta, renombrar, eliminar, descargar, drag & drop) aparezcan **dentro del árbol central de aseguradoras** que se ve en la imagen (`InsurerTree`), no en un panel aparte.

## Plan

### 1. `src/components/InsurerTree.tsx` — añadir gestión de archivos

**Toolbar superior del árbol** (sticky arriba):
- Botón **"Subir PDF"** (icon `Upload`) — sube al nodo expandido actual.
- Botón **"Nueva carpeta"** (icon `FolderPlus`) — crea subcarpeta en la aseguradora.
- Botón **"Refrescar"** (icon `RefreshCw`).

**Por nodo de aseguradora** (acciones siempre visibles a la derecha, compactas):
- `Upload` — subir PDF a esa carpeta de aseguradora.
- `FolderPlus` — nueva subcarpeta.
- Drop zone: arrastrar PDFs encima → upload directo. Resalta con borde primary al hover de drag.

**Por nodo de formulario/archivo** (acciones siempre visibles):
- `Download` — descargar el PDF.
- `Pencil` — renombrar.
- `Trash2` — eliminar (con confirmación).
- Drop zone: soltar PDF → reemplaza el archivo (`upsert`).

**Diálogos integrados en el árbol**:
- Dialog renombrar (input + Guardar).
- Dialog nueva carpeta (input + Crear).
- AlertDialog eliminar (confirmación destructiva).
- Card flotante abajo-derecha con progreso de uploads activos.

### 2. `src/hooks/useStorageFormatos.ts` (nuevo)

Hook que centraliza el CRUD del bucket `formatos`, extrayendo la lógica de `StorageManager.tsx`:
- `uploadFiles(path, files)` con progreso.
- `createFolder(parentPath, name)` (placeholder `.emptyFolderPlaceholder`).
- `renameItem(oldPath, newPath, isFolder)`.
- `deleteItem(path, isFolder)` con `listAllRecursive` para carpetas.
- Invalida `useFormularios` / `useAseguradoras` tras cambios.

### 3. `StorageManager.tsx`

Se conserva el archivo (no se borra) por si se reutiliza, pero deja de estar enlazado en cualquier UI.

## Archivos

- `src/components/admin/InsurerTree.tsx` — toolbar + acciones por nodo + drop zones + diálogos.
- `src/hooks/useStorageFormatos.ts` (nuevo) — CRUD del bucket.
- `src/pages/admin/FormatManager.tsx` — sin cambios (la pestaña Archivos y el botón header ya estaban marcados para eliminar; se confirma su retiro si aún están).

Sin migraciones de BD.

## Resultado visual

```text
┌─────────────────────────────────────────┐
│ [⬆ Subir PDF] [📁+ Carpeta]      [⟳]    │ ← toolbar sticky
├─────────────────────────────────────────┤
│ ▸ BANORTE                  (2)  ⬆ 📁+   │
│ ▾ GNP                      (2)  ⬆ 📁+   │
│   📄 Informe Médico              ⬇ ✎ 🗑 │
│   📄 Solicitud de Reembolso      ⬇ ✎ 🗑 │ ← drop PDF = reemplazar
│ ▸ MAPFRE                   (2)  ⬆ 📁+   │ ← drop PDF = subir aquí
│ ▸ METLIFE                  (4)  ⬆ 📁+   │
└─────────────────────────────────────────┘
        [Subiendo: archivo.pdf 45%]  ← card flotante
```


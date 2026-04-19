

## Objetivo

En `/formatos`, al seleccionar una póliza, mostrar **solo los formatos PDF reales** que existen en `formatos/<ASEGURADORA>/` en Storage, listados con el nombre del archivo **sin la extensión** (ej. `informe_medico`, `aviso_accidente`).

## Problema actual

`src/pages/Formats.tsx` tiene una función local `getFormats(company)` hardcodeada que solo distingue MetLife vs MAPFRE y apunta a rutas inexistentes (`/forms/METLIFE_REEMBOLSO.pdf` en `public/`). No refleja las 10 aseguradoras reales ni los 23 PDFs en el bucket `formatos`.

## Solución

### 1. Reutilizar el catálogo `getAvailableFormats` del registry

Ya existe en `src/components/claims/forms/registry.ts` el catálogo `insurerFormats` con las 10 aseguradoras y sus archivos reales. Lo importamos en `Formats.tsx`.

### 2. Reescribir `Formats.tsx`

- Eliminar `getFormats()` local y el array hardcodeado.
- Al seleccionar póliza → llamar `getAvailableFormats(policy.company)` → renderizar lista.
- Cada item muestra el `id` del formato (ya viene sin extensión: `informe_medico`, `aviso_accidente`, `carta_remesa`, etc.) como el nombre principal solicitado.
- Botón "Descargar" usa Supabase Storage:
  ```ts
  const { data } = supabase.storage
    .from("formatos")
    .getPublicUrl(`${insurer}/${format.file}`);
  ```
  El bucket `formatos` ya es público.
- Si la aseguradora no tiene formatos en el catálogo → mensaje "Esta aseguradora no tiene formatos disponibles".

### 3. Detalles de UX

- Nombre mostrado: `format.id` (ej. `informe_medico`) — sin extensión, como pidió el usuario.
- Descarga: usar `<a href={publicUrl} download={fileName} target="_blank">` para abrir/descargar desde Storage.
- Mantener el toast de confirmación.

## Archivos a modificar

```text
edita: src/pages/Formats.tsx   (usar getAvailableFormats + descargar desde Storage)
```

## Notas

- No se tocan archivos en Storage.
- No se modifica `registry.ts` (ya tiene la API necesaria).
- El bucket `formatos` ya es público → `getPublicUrl` funciona sin firma.


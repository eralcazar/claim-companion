

## Objetivo

Pieza 3: **editor visual de coordenadas**. Abrir un PDF dentro del Gestor de Formatos, ver overlays de los campos existentes encima del PDF, y permitir **mover/redimensionar/crear** cajas con drag para fijar las coordenadas (% relativas a la página).

## UX

Nueva tab **"Editor visual"** en el detalle del formulario, junto a Campos / Secciones / Info.

```text
┌─────────────────────────────────────────────────────────────┐
│ Editor visual — Informe Médico (ALLIANZ)                    │
│ Página: [◀] 1 / 2 [▶]   Zoom: [─●──] 100%   [+ Nuevo campo] │
├──────────────────────────────────┬──────────────────────────┤
│  ┌────────────────────────────┐  │ Campo seleccionado       │
│  │                            │  │                          │
│  │   PDF página 1 renderizado │  │ Clave:  [NOMBRE_PAC]     │
│  │                            │  │ Etiq.:  [Nombre paciente]│
│  │   ┌────┐  ← caja campo     │  │ Tipo:   [texto ▼]        │
│  │   │NOMB│    (drag/resize)  │  │ Mapeo:  [perfil.full_..] │
│  │   └────┘                   │  │ Pág:1 X:32% Y:18% ...    │
│  │                            │  │                          │
│  │   ┌──────┐                 │  │ [Eliminar] [Duplicar]    │
│  │   │CURP  │                 │  │                          │
│  │   └──────┘                 │  │ ─── Modo creación ───    │
│  │                            │  │ Click+arrastra sobre el  │
│  └────────────────────────────┘  │ PDF para crear un campo  │
└──────────────────────────────────┴──────────────────────────┘
```

Mobile (<768px): el panel lateral colapsa a Sheet inferior; el visor ocupa el ancho completo.

## Funcionalidad

**Visor PDF** (`react-pdf` + `pdfjs-dist`):
- Carga el PDF desde `getPublicUrl(formulario.storage_path)`.
- Renderiza una página a la vez, navegable con flechas y atajos `←`/`→`.
- Slider de zoom 50–200%.
- Layer absoluto encima del canvas con los `campos` cuya `campo_pagina === pagina_actual`.

**Cajas (overlays)**:
- Posición y tamaño calculados desde `campo_x/y/ancho/alto` (% del page rect).
- Componente `<FieldBox>` con:
  - **Drag** del centro para mover.
  - **8 handles** para redimensionar (esquinas + lados).
  - Hover muestra `clave`; click la selecciona (ring azul).
  - Doble-click abre edición rápida del label en el panel.
- Cambios live: se reflejan en `campo_x/y/ancho/alto` en estado local; al soltar (`onMouseUp`) se hace `upsert` debounceado a `campos`.

**Modo "Nuevo campo"**:
- Toggle del botón → cursor crosshair.
- Mouse-down + drag sobre el PDF dibuja una caja nueva.
- Al soltar, se crea fila en `campos` con clave autogenerada (`CAMPO_<n>`), página actual y coordenadas en %; queda seleccionada.

**Panel lateral** (campo seleccionado):
- Reuso del editor inline de `FieldsTable` — mismos inputs (clave, etiqueta, tipo, requerido) + `MappingSelects`.
- Inputs numéricos para X/Y/W/H (sincronizados con el drag).

**Sin selección**: panel muestra resumen (total campos en la página, total en el formulario, leyenda de colores por mapeo).

## Coordenadas

- Almacenamiento: % (0-100) relativos al page rect renderizado por pdf.js.
- Conversión drag→%: `((eventX - pageRect.left) / pageRect.width) * 100`.
- Esto coincide con lo ya definido en el esquema (`campo_x float`, etc.) y es resolución-agnóstico.

## Persistencia

- Mutación `upsert` a `campos` con debounce 400ms tras drag/resize.
- Crear/eliminar usan los hooks ya existentes (`useUpsertCampos`, `useDeleteCampo`).
- Toast solo en errores; los saves silenciosos para no spamear durante drag.

## Dependencias nuevas

- `react-pdf` (^9) + `pdfjs-dist` (^4): renderizado del PDF en canvas.
- Worker de pdf.js servido desde CDN (sin tocar Vite config).
- Sin libs de drag externas — usamos `pointer events` nativos para mantener bundle pequeño.

## Archivos

```text
crea:  src/components/admin/PDFCanvasEditor.tsx   (visor + capa de overlays + crear con drag)
crea:  src/components/admin/FieldBox.tsx          (caja draggable/resizable individual)
crea:  src/components/admin/FieldSidebar.tsx      (panel derecho: edición del campo seleccionado)
crea:  src/components/admin/VisualEditor.tsx      (orquesta canvas + sidebar + selección)
crea:  src/lib/pdfWorker.ts                       (configura el worker de pdfjs-dist)
edita: src/pages/admin/FormatManager.tsx          (nueva tab "Editor visual")
edita: src/hooks/useFormatos.ts                   (helper updateCampo individual sin toast para drag)
edita: package.json                               (react-pdf + pdfjs-dist)
```

## Lo que NO incluye

- Edición de **labels** (las cajas `label_*`). Mismo patrón aplica; lo añadimos en una iteración posterior si quieres.
- Detección automática de campos por IA / OCR.
- Multi-selección y operaciones en lote (alinear, distribuir).
- Snap a grid o a otros campos.


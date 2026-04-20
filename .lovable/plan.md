

## Objetivo

Crear `/admin/gestor-archivos`: gestor de archivos con árbol de aseguradoras + sus PDFs (desde `formularios`), y al seleccionar un formulario, una **tabla editable de campos** (`campos`) con sus mapeos a `profiles` / `insurance_policies` / `claims` y coordenadas. Solo accesible por rol `admin`.

## Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│ Gestor de Formatos                            [+ Nuevo campo]   │
├──────────────────┬──────────────────────────────────────────────┤
│ ÁRBOL (izq)      │ DETALLE FORMULARIO (der)                     │
│                  │                                              │
│ ▼ ALLIANZ (4)    │ Informe Médico — ALLIANZ                     │
│   ├ informe_med  │ formatos/ALLIANZ/informe_medico.pdf  [Abrir] │
│   ├ aviso_acc    │ Páginas: 2 · Campos estimados: 25            │
│   ├ carta_remesa │                                              │
│   └ ident_clien  │ Tabs: [Campos] [Secciones] [Info]            │
│ ▶ AXA (3)        │                                              │
│ ▶ BANORTE (2)    │ Tabla campos:                                │
│ ▶ ...            │ ┌──┬──────┬──────┬─────┬──────┬────────────┐ │
│                  │ │# │Clave │Etiq. │Tipo │Mapeo │Coords      │ │
│                  │ │1 │NOMBRE│Nombre│texto│perfil│p1 X,Y W×H  │ │
│                  │ │  │      │      │     │.NOM..│            │ │
│                  │ └──┴──────┴──────┴─────┴──────┴────────────┘ │
│                  │ [Guardar cambios] [Eliminar] [Duplicar]      │
└──────────────────┴──────────────────────────────────────────────┘
```

Vista mobile (<768px): árbol arriba como Select de aseguradora + lista de formularios; tabla scrolleable horizontal.

## Funcionalidad

**Árbol** (panel izq, desktop) / **Select** (mobile):
- Lista 10 aseguradoras desde `aseguradoras` con conteo de formularios.
- Expandir muestra los `formularios` de esa aseguradora.
- Click en un formulario lo selecciona en el panel derecho.

**Panel derecho** — header del formulario:
- Nombre, aseguradora, `storage_path`, páginas, total campos en BD vs estimado.
- Botón **Abrir PDF** → abre `getPublicUrl` del bucket `formatos`.

**Tab "Campos"** — tabla editable inline:
- Columnas: `#`, `Clave`, `Etiqueta`, `Tipo`, `Mapeo` (3 selects encadenados: tabla → columna), `Página`, `X%`, `Y%`, `W%`, `H%`, `Requerido`, `Acciones`.
- Edición inline con `Input`/`Select`. Cambios pendientes marcados con dot amarillo.
- **Guardar cambios** → upsert batch a `campos`.
- **+ Nuevo campo** → fila nueva con defaults.
- **Eliminar** fila individual (con confirm).
- Filtro por sección + búsqueda por clave/etiqueta.

**Tab "Secciones"**:
- Lista simple `secciones` del formulario con orden y página.
- CRUD básico (agregar/renombrar/eliminar/reordenar).

**Tab "Info"**:
- Editar `nombre_display`, `total_paginas`, `total_campos_estimado`, `activo`.

## Mapeo (3 dropdowns)

```
Tabla:    [— Sin mapeo ▼]  [perfiles] [polizas] [siniestros]
Campo:    [— Seleccionar ▼] (depende de la tabla)
```

- Opciones cargadas de `mapeo_perfiles` / `mapeo_polizas` / `mapeo_siniestros`.
- Solo se permite **una** asignación a la vez (las otras dos columnas se limpian).
- Badge `⚡ Mapeado` (verde) o `○ Manual` (gris) al final de la fila.

## Acceso y seguridad

- Ruta `/admin/gestor-archivos` envuelta en `ProtectedRoute` + check `roles.includes("admin")`. Si no es admin → redirect a `/`.
- RLS ya está: solo admin puede `INSERT/UPDATE/DELETE` en `campos`/`secciones`/`formularios`. No se requiere migración.

## Archivos

```text
crea:  src/pages/admin/FormatManager.tsx          (página principal + layout)
crea:  src/components/admin/InsurerTree.tsx       (árbol aseguradoras+formularios)
crea:  src/components/admin/FormHeader.tsx        (info formulario seleccionado)
crea:  src/components/admin/FieldsTable.tsx       (tabla editable de campos)
crea:  src/components/admin/SectionsList.tsx      (CRUD secciones)
crea:  src/components/admin/MappingSelects.tsx    (3 selects encadenados)
crea:  src/hooks/useFormatos.ts                   (queries: aseguradoras, formularios, campos, mapeos)
edita: src/App.tsx                                (ruta /admin/gestor-archivos, gated por rol admin)
edita: src/components/AppSidebar.tsx              (link "Gestor de Formatos" en sección Admin)
```

## Stack técnico

- React Query para `aseguradoras`, `formularios`, `campos`, `secciones`, `mapeo_*`.
- Mutaciones con `supabase.from(...).upsert/update/delete` + invalidación de queries.
- shadcn `Table`, `Input`, `Select`, `Tabs`, `Collapsible`, `Badge`, `Button`, `AlertDialog` (confirm delete), `Sonner` toasts.
- Sin nuevas dependencias.

## Lo que NO incluye

- Visor PDF con overlay interactivo de coordenadas (eso es la pieza 3 — Field Mapper visual).
- Análisis IA de PDFs.
- Subida de nuevos PDFs al bucket (los 23 ya están).
- Generación de PDFs llenados.

## Tras aprobar

Implemento todo en una sola pasada. Listo para que entres como admin a `/admin/gestor-archivos` y empieces a poblar campos manualmente formulario por formulario, o esperar a la pieza 3 (editor visual con drag).


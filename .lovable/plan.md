

## Objetivo

Ampliar el Gestor de Formatos y agregar un módulo de Médicos con catálogos asociados.

---

## 1. Detección IA mejorada (campos + secciones + coordenadas pregunta/respuesta)

**Edge function** `detect-form-fields/index.ts`:
- Schema ampliado:
  ```
  secciones: [{ nombre, pagina, orden }]
  propuestas: [{
    clave, etiqueta, tipo, page, seccion_sugerida,
    label: { x, y, w, h },   // pregunta (etiqueta del PDF)
    campo: { x, y, w, h }    // respuesta (espacio a llenar)
  }]
  ```
- Prompt actualizado para devolver SIEMPRE ambos rectángulos (`label` = pregunta visible, `campo` = espacio en blanco / línea / casilla).

**Cliente** `VisualEditor.tsx`:
- `handleDetect` recibe `secciones` + propuestas con dos rects.
- `acceptAllProposals`:
  1. Upsert de secciones nuevas (por `nombre+pagina`) → recolectar `id`.
  2. Insert campos con `seccion_id`, `campo_pagina`, `campo_x/y/w/h`, `label_pagina`, `label_x/y/w/h`.
- `PDFCanvasEditor` ya soporta dibujar ambos rects; añadir overlay distintivo para `label_*` durante revisión de propuestas.

---

## 2. UI de campos y secciones

**`FieldsTable.tsx`**:
- Nuevas columnas: **Página**, **Sección** (select editable filtrada por página), **Valor mapeado** (preview del mapeo seleccionado: `nombre_display` + `columna_origen` o badge "Manual").
- **Selección múltiple**: checkbox header (todos) + checkbox por fila → botón "Eliminar seleccionados" (`AlertDialog` confirma).
- Filtro adicional por página.

**`SectionsList.tsx`**:
- Mismo patrón: checkboxes + "Eliminar seleccionadas".
- Página ya editable (sin cambios de schema).

**`ProposalsPanel.tsx`**:
- Mostrar `Pág. {p.page} · {seccion_sugerida ?? "Sin sección"}`.

---

## 3. Storage Manager (bucket `formatos`) — con drag & drop

**Nuevo** `src/components/admin/StorageManager.tsx`:
- Lista carpetas/archivos vía `supabase.storage.from('formatos').list(prefix)`.
- Acciones: crear/renombrar/borrar directorio (recursivo con `move`/`remove`); cargar/renombrar/borrar archivo.
- **Drag & drop**: zona con `onDragOver`/`onDrop` que acepta múltiples PDFs, sube en paralelo con barra de progreso por archivo (toasts).
- Confirmaciones destructivas con `AlertDialog`.

**Integración**: nueva tab "Archivos" en `FormatManager > FormDetail` + botón global "Archivos del bucket" (Sheet).

**Migración**: política `storage.objects` para bucket `formatos` que permite INSERT/UPDATE/DELETE a admins.

---

## 4. Módulo de Médicos (catálogo)

**Schema nuevo**:
- `especialidades` — `id uuid pk`, `nombre text unique`, `activa bool`.
- `medicos` — `id uuid pk`, `user_id uuid` (referencia a `auth.users`, único, NO FK a auth), `cedula_general text`, `telefono_consultorio`, `direccion_consultorio`, timestamps.
- `medico_especialidades` — `id`, `medico_id`, `especialidad_id`, `cedula_especialidad text`, unique(medico, especialidad).
- `medico_documentos` — `id`, `medico_id`, `tipo text` ('ine' | 'cedula_general' | 'cedula_especialidad'), `especialidad_id nullable`, `file_path text`, `file_name`, `created_at`.
- Bucket privado `medicos` con políticas: el médico ve los suyos, admin ve todos.

**RLS**:
- `especialidades`: read autenticado, ALL admin.
- `medicos`, `medico_especialidades`, `medico_documentos`: SELECT/UPDATE el propio médico (`user_id = auth.uid()`), ALL admin.

**Páginas/UI**:
- `src/pages/admin/EspecialidadesCatalog.tsx` — CRUD simple (admin only).
- `src/pages/admin/MedicosManager.tsx` (admin) — lista todos los `profiles` con rol `medico` (vía `user_roles`); permite editar el registro `medicos` de cada uno, asignar/quitar especialidades, subir documentos.
- `src/pages/DoctorProfile.tsx` (médico) — misma UI pero limitada a su propio registro.
- Rutas en `App.tsx`: `/admin/especialidades`, `/admin/medicos`, `/medico/perfil`.
- Entradas en `AppSidebar.tsx` (admin: ambos catálogos; médico: su perfil) con `FeatureKey` correspondientes en `lib/features.ts`.

---

## 5. Catálogo de médicos como fuente de mapeo

- Nueva tabla de mapeo `mapeo_medicos` con filas como las otras (`id text pk`, `nombre_display`, `columna_origen`, `tipo`).
- Seed con: `cedula_general`, `nombre_completo`, `telefono_consultorio`, `direccion_consultorio`, `especialidad_principal`, `cedula_especialidad`.
- Campo nuevo en `campos`: `mapeo_medico text nullable` (mismo patrón que los otros 3 mapeos).
- Hook `useMapeos` retorna ahora `{ perfiles, polizas, siniestros, medicos }`.
- `MappingSelects.tsx`: añadir opción "Médico" como cuarta tabla origen.
- `FieldsTable` "Valor mapeado" considera también `mapeo_medico`.
- En autollenado (siguiente iteración) el médico activo del trámite (ej. `claim.doctor_id`) alimenta estos campos.

---

## 6. Auto-sugerencia IA de mapeos (siguiente iteración — ya planeado)

Después de aceptar campos, segunda llamada a edge function que recibe la lista de `{clave, etiqueta}` + las opciones de mapeo (de las 4 tablas) y devuelve `{ campo_id, mapeo_tipo, mapeo_id }[]` con la mejor coincidencia. UI con review y "Aplicar todo".

---

## Archivos

```text
edita: supabase/functions/detect-form-fields/index.ts
edita: src/components/admin/VisualEditor.tsx
edita: src/components/admin/PDFCanvasEditor.tsx       (overlay propuestas con label+campo)
edita: src/components/admin/ProposalsPanel.tsx
edita: src/components/admin/FieldsTable.tsx           (cols Pág/Sección/Valor + checkboxes + bulk delete)
edita: src/components/admin/SectionsList.tsx          (checkboxes + bulk delete)
edita: src/components/admin/MappingSelects.tsx        (opción Médico)
edita: src/hooks/useFormatos.ts                       (mapeo_medicos, mapeo_medico en Campo, bulk delete mutation)
crea : src/components/admin/StorageManager.tsx        (drag & drop)
edita: src/pages/admin/FormatManager.tsx              (tab Archivos + botón global)

crea : src/hooks/useMedicos.ts
crea : src/hooks/useEspecialidades.ts
crea : src/pages/admin/EspecialidadesCatalog.tsx
crea : src/pages/admin/MedicosManager.tsx
crea : src/pages/DoctorProfile.tsx
edita: src/App.tsx                                    (3 rutas nuevas)
edita: src/components/AppSidebar.tsx                  (entradas nuevas)
edita: src/lib/features.ts                            (claves admin.especialidades, admin.medicos, medico.perfil)

crea : supabase/migrations/<ts>_storage_formatos_admin.sql
crea : supabase/migrations/<ts>_medicos_catalogo.sql       (especialidades, medicos, medico_especialidades, medico_documentos, bucket medicos + políticas)
crea : supabase/migrations/<ts>_mapeo_medicos_y_campo.sql  (tabla mapeo_medicos + columna campos.mapeo_medico + seeds)
```

## Lo que NO incluye (siguiente iteración)
- Auto-sugerencia IA de mapeos.
- Aplicar autollenado de `mapeo_medico` en la generación del PDF (sólo se prepara la fuente; el `buildOverlayData` se actualiza en otra pasada cuando definamos cómo se selecciona el médico activo del trámite).


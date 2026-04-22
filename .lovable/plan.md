

## Objetivo

Tres mejoras integradas al sistema de formularios de reclamos, todas centradas en hacer que el wizard se construya **dinámicamente desde lo configurado en Gestor de Formatos** (campos `etiqueta`, opciones de radio/checkbox con coordenadas individuales por opción) y permitir **firma electrónica reutilizable** desde un gestor de firmas del usuario.

1. **Wizard dinámico desde DB**: el formulario de reclamo se renderiza usando `etiqueta`, `secciones` y `opciones` reales de la tabla `campos`, no más definiciones hardcoded `formA…formH`.
2. **Opciones múltiples en radio/checkbox**: en `FieldsTable`, cuando el tipo es `radio` o `checkbox`, mostrar un sub-editor para agregar/quitar opciones, **cada una con sus propias coordenadas** (página, x, y, w, h) en el PDF.
3. **Gestor de Firmas + tipo de campo `firma` mapeable**: agregar tabla `firmas_usuario`, una página `/perfil/firmas` para crear/eliminar firmas, opción "Firma" en el catálogo de mapeos, y al generar el reclamo un toggle "¿Firmar electrónicamente?" que estampa la firma elegida en cada campo `tipo='firma'`.

## Cambios

### 1. Esquema de BD (migración)

**`campos.opciones` (jsonb)** — ya existe, ahora se usará con esta forma para radio/checkbox:
```json
[
  { "valor": "accidente", "etiqueta": "Accidente",
    "campo_pagina": 1, "campo_x": 12.5, "campo_y": 34.2, "campo_ancho": 1.5, "campo_alto": 1.5 },
  { "valor": "enfermedad", "etiqueta": "Enfermedad",
    "campo_pagina": 1, "campo_x": 12.5, "campo_y": 36.8, "campo_ancho": 1.5, "campo_alto": 1.5 }
]
```
No requiere cambio de schema; sólo de convención.

**Nueva tabla `firmas_usuario`**:
- `id uuid pk`
- `user_id uuid not null`
- `nombre text not null` (etiqueta visible: "Firma personal", "Firma con título", etc.)
- `imagen_base64 text not null` (PNG dataURL)
- `es_predeterminada boolean default false`
- `created_at timestamptz default now()`
- RLS: dueño ve/crea/edita/borra los suyos; admin todo.
- Índice único parcial: `(user_id) WHERE es_predeterminada = true` (sólo una predeterminada por usuario).

**Nuevo mapeo "Firma"** — insert tool:
- En `mapeo_perfiles` agregar fila `id='firma_usuario'`, `nombre_display='Firma del usuario'`, `columna_origen='__firma__'`, `tipo='firma'` (token especial reconocido por el pipeline).

### 2. Gestor de Firmas (Perfil)

**Nuevo componente `src/pages/FirmasManager.tsx`** (ruta `/perfil/firmas`, link desde `Profile.tsx`):
- Lista las firmas del usuario en cards (preview + nombre + badge "Predeterminada").
- Botón **"+ Nueva firma"** abre dialog con `SignatureCanvas` + input nombre + checkbox "Marcar como predeterminada".
- Acciones por firma: marcar predeterminada, renombrar, eliminar.
- Hook `src/hooks/useFirmas.ts`: `useFirmas()`, `useCreateFirma()`, `useUpdateFirma()`, `useDeleteFirma()`, `useSetFirmaPredeterminada()` (esta última desmarca las demás en una transacción RPC o dos updates).

### 3. FieldsTable — sub-editor de opciones

En `src/components/admin/FieldsTable.tsx`, cuando `c.tipo === "radio" || c.tipo === "checkbox"`, agregar una **fila expandible** debajo del row principal (toggle con chevron) que muestra:
- Tabla compacta de opciones (`c.opciones || []`):
  - Columnas: `Valor` (input, slug), `Etiqueta` (input), `Pág`, `X%`, `Y%`, `W%`, `H%`, `🗑`
  - Botón **"+ Agregar opción"** al pie (default w/h = 1.5%, página = `c.campo_pagina`).
- Validación: `radio` permite múltiples opciones pero al renderizar el wizard sólo una seleccionable; `checkbox_group` (cuando tipo='checkbox' con >1 opción) permite múltiples seleccionables.
- Las opciones se persisten en la columna `opciones` (jsonb) usando `useUpsertCampos` ya existente.

Helper `update(id, { opciones: [...] })` ya funciona; sólo agregar UI.

Para campos tipo `checkbox` con UNA sola opción → renderizar como checkbox simple booleano. Con >1 → `checkbox_group`.

### 4. Tipo `firma` en FieldsTable + sub-editor

Para `c.tipo === "firma"`:
- En la columna **"Catálogo"**, agregar opción nueva **"firma"** además de perfil/poliza/siniestro/medico.
- Al elegir catálogo "firma", el campo de mapeo se preselecciona con el id `firma_usuario` (único valor disponible).
- En el render del PDF, este campo no escribe texto: estampa la imagen de la firma elegida por el usuario en las coordenadas `campo_x/y/w/h`.

### 5. Renderer dinámico desde DB (`DynamicFormRenderer`)

Crear `src/components/claims/forms/DynamicFormRenderer.tsx` que reemplace gradualmente `FormRenderer.tsx`:
- Recibe `formularioId`, carga `useCampos(formularioId)` + `useSecciones(formularioId)`.
- Agrupa campos por `seccion_id` (o "sin sección"); cada sección = un paso del wizard.
- Renderiza por `tipo`:
  - `texto`/`textarea`/`numero`/`fecha`/`telefono`/`rfc`/`curp` → inputs (etiqueta = `c.etiqueta`).
  - `radio` → `RadioGroup` con `c.opciones[]` (label = `opcion.etiqueta`, value = `opcion.valor`).
  - `checkbox` con 1 opción → boolean; con N opciones → `checkbox_group` (multi-select).
  - `select` → `Select` con `c.opciones[]`.
  - `firma` → `SignatureCanvasReadOnly` que muestra preview de la firma predeterminada + botón "Cambiar" abre modal con la lista de firmas del usuario; el valor guardado en `data` es el `firma_id`.
  - `diagnostico_cie` → autocomplete (placeholder por ahora = input texto con badge).
- Validación: `c.requerido` + `c.patron_validacion` (regex) + `c.longitud_max`.
- Autofill: al cargar la póliza, mirar `c.mapeo_perfil/poliza/siniestro/medico` para pre-llenar.

`NewClaim.tsx`:
- Refactor: en lugar de `getFormDefinition(insurer, tramite)`, hacer `useFormulario(insurer, tramite)` que resuelve el `formularios.id` correspondiente y le pasa al `DynamicFormRenderer`.
- Se conserva la lógica de wizard (steps por sección), autosave, draft, y pipeline final.
- **Compatibilidad**: si no existe `formulario` configurado en BD para esa combinación, fallback al `getFormDefinition` legacy.

### 6. Toggle "¿Firmar electrónicamente?" en review

En el paso de revisión de `NewClaim.tsx`:
- Si la definición/campos contienen al menos uno de `tipo='firma'`, mostrar:
  - Switch **"Firmar electrónicamente"** (default: on si el usuario tiene firma predeterminada).
  - Select **"Firma a usar"** con las firmas del usuario (default: predeterminada).
  - Si el usuario no tiene firmas → link "Crear firma en mi perfil" (abre `/perfil/firmas`).
- El `firma_id` elegida se inyecta en `data.__firma_id` antes de llamar `runClaimPipeline`.

### 7. Pipeline + PDF: estampar firma e imagen

**`src/lib/pdfFiller.ts`**: nueva función `drawImage(pdfBytes, images: Array<{page, x, y, w, h, dataUrl}>)` que decodifica PNG base64 y usa `pdf-lib` `embedPng` + `page.drawImage` con coordenadas en %.

**`src/lib/generateFilledPDF.ts`** (o un nuevo `generateFilledPDFDynamic.ts`):
- Cuando se generen PDFs desde la definición dinámica de DB, recorrer `campos`:
  - Para `tipo` normal: convertir `(x%,y%)` → puntos PDF (multiplicar por dimensiones de página) y llamar `fillPDF` con valor de `data[c.clave]`.
  - Para `tipo='radio'`: estampar `"X"` SOLO en la opción cuyo `valor === data[c.clave]`.
  - Para `tipo='checkbox'` (multi): estampar `"X"` en cada opción incluida en `data[c.clave]` (array).
  - Para `tipo='firma'`: si `data.__firma_id` está set, cargar la firma desde `firmas_usuario`, embed PNG y dibujar en las coordenadas del campo.

`runClaimPipeline` se extiende para aceptar el `__firma_id` y, en lugar de usar `formCoordinates` estático cuando hay un `formulario` real en DB, usar el nuevo path dinámico que lee de `campos`.

### 8. Migración legacy

- Las definiciones `formA…formH` siguen funcionando como fallback hasta que un `formulario` esté completamente configurado en BD para esa (insurer, tramite).
- Una vez admin termina de mapear campos+opciones+coordenadas en `/admin/gestor-archivos`, el sistema usa la versión DB automáticamente.

## Archivos

**Creados:**
- Migración SQL: tabla `firmas_usuario` + RLS + índice único de predeterminada.
- Insert tool: fila en `mapeo_perfiles` con id `firma_usuario`.
- `src/hooks/useFirmas.ts` — CRUD de firmas.
- `src/pages/FirmasManager.tsx` — UI del gestor de firmas.
- `src/components/claims/forms/DynamicFormRenderer.tsx` — renderer basado en DB.
- `src/components/claims/forms/shared/SignaturePicker.tsx` — selector de firma del usuario para campos `tipo=firma`.
- `src/components/admin/CampoOpcionesEditor.tsx` — sub-editor inline de opciones con coordenadas (usado por `FieldsTable`).

**Modificados:**
- `src/components/admin/FieldsTable.tsx` — fila expandible de opciones cuando tipo es radio/checkbox; opción "firma" en columna catálogo.
- `src/lib/pdfFiller.ts` — `drawImage()` para estampar firma.
- `src/lib/generateFilledPDF.ts` — soporte dinámico desde campos DB (radio individual, checkbox multi, firma).
- `src/lib/claimPipeline.ts` — branch dinámico cuando hay `formulario` configurado, inyección de `firma_id`.
- `src/pages/NewClaim.tsx` — usar DynamicFormRenderer con fallback, toggle "Firmar electrónicamente" en review.
- `src/pages/Profile.tsx` — link "Mis firmas" → `/perfil/firmas`.
- `src/App.tsx` — ruta `/perfil/firmas`.

## Resultado esperado

**Admin** abre `/admin/gestor-archivos` → selecciona formulario MetLife Reembolso → en `Campos` ve un campo tipo `radio` "Causa de atención" → expande la fila → ve 3 opciones (`accidente`, `enfermedad`, `embarazo`) cada una con sus coordenadas (X%, Y%, W%, H%) → click **"+ Agregar opción"** "maternidad" → ajusta coordenadas → Guardar.

**Usuario paciente** abre `/perfil` → entra a **"Mis firmas"** → captura su firma con el canvas → la marca como predeterminada.

**Usuario paciente** abre `/reclamos/nuevo` → elige póliza MetLife + Reembolso → el wizard se construye dinámicamente desde `campos` y `secciones` de DB, mostrando las etiquetas configuradas → la sección "Causa" muestra los 4 radio options (uno seleccionable) → la sección "Firma" muestra preview de su firma predeterminada → en revisión aparece switch **"Firmar electrónicamente"** con select de firma → genera PDF: el radio "enfermedad" estampa "X" sólo en sus coordenadas, los checkbox de facturas estampan "X" en cada opción seleccionada, y la firma PNG se estampa en el rectángulo del campo `tipo='firma'`. Folio asignado, archivo en Storage.


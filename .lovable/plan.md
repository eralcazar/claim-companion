
El usuario está pegando de nuevo el spec completo de la Parte 3 (pdf-lib + coordenadas + integración en NewClaim). Verifico estado actual antes de proponer cambios.

Estado verificado en mensajes previos:
- `pdf-lib` ya instalado y en uso
- `src/lib/pdfFiller.ts` ya existe con `fillPDF` + `drawCheckmark` + sanitización Latin-1
- `src/lib/formCoordinates.ts` ya existe con paths en MAYÚSCULAS sincronizados con el bucket
- `src/lib/generateFilledPDF.ts` ya existe con `getPDFFromStorage`, `generateFilledPDF`, `downloadPDF`, `buildOverlayData`
- `src/components/claims/forms/registry.ts` ya tiene `getFormKey(insurer, tramite)`
- `src/pages/NewClaim.tsx` ya integra el flujo: `getFormKey` → `generateFilledPDF` → upload → `downloadPDF`
- Bucket `formatos` público con los 23 PDFs verificados
- `gen_folio` corregido (ambigüedad `folio` resuelta vía `cf.folio` + `v_folio`)
- RLS DELETE en `claims` y `claim_documents` agregado

El sistema completo ya está implementado. Lo único que el spec nuevo aporta vs lo actual son **coordenadas más precisas y completas** para cada formulario (el usuario las llama "exactas" pero el propio spec advierte que requieren calibración fina).

## Plan: Sincronizar coordenadas con la nueva especificación

### Diferencias clave entre spec nuevo y actual

1. **Convención de keys**: el spec usa keys MAYÚSCULAS para los formularios (`GNP_aviso_accidente`, `AXA_reembolso`...), el código actual usa minúsculas (`gnp_aviso_accidente`). Ambas funcionan si `getFormKey` y `formCoordinates` coinciden — debo decidir una y mantener consistencia.

2. **Coordenadas más detalladas**: el spec trae listas más completas de campos por formulario (ej. RFC letra-por-letra, fechas día/mes/año descompuestas, checkboxes posicionados).

3. El resto de la infraestructura (`pdfFiller.ts`, `getPDFFromStorage`, `downloadPDF`, integración en `NewClaim`) ya está y coincide funcionalmente con lo que pide el spec.

### Cambios a realizar

**1. `src/lib/formCoordinates.ts`** — reemplazar el contenido completo con el catálogo de coordenadas del spec (manteniendo las keys en minúsculas para no romper `registry.ts`, o cambiando ambos a MAYÚSCULAS de forma consistente). Decisión: **mantener minúsculas** porque `registry.ts` ya las usa así y NewClaim funciona; solo actualizar los `storagePath` (ya en MAYÚSCULAS) y el array `fields` con la lista detallada del spec.

**2. `src/lib/generateFilledPDF.ts`** — extender `buildOverlayData` para producir las nuevas keys que aparecen en el spec:
   - `rfc_l1..rfc_h3` (RFC descompuesto letra por letra para GNP)
   - `fecha_nac_dia/mes/año`, `fecha_dia/mes/año` (fechas descompuestas)
   - `codigo_cliente`, `nombres` (alias)
   - `check_masculino/femenino` con "X"
   - `check_causa_accidente/enfermedad`
   - Totales sumados de gastos (`total_gastos`)
   - Edad calculada (`edad`)

**3. Nada más** — `pdfFiller.ts`, `NewClaim.tsx`, `registry.ts`, bucket, RLS, gen_folio: todo ya está.

### Archivos modificados

```text
edita: src/lib/formCoordinates.ts        (catálogo completo del spec)
edita: src/lib/generateFilledPDF.ts      (nuevas keys en buildOverlayData)
```

### Notas importantes para el usuario

- Las coordenadas son **aproximaciones** según el propio spec. Después de generar el primer PDF de prueba habrá que ajustar fino x/y comparando visualmente con el original. Esto es trabajo iterativo manual, no de un solo paso.
- Los formularios D, E, F, G, H que el spec sólo lista como "plantillas base" mantendrán fallback al generador jsPDF actual hasta que el usuario provea coordenadas detalladas.
- Firma como imagen embebida queda fuera de alcance hasta que el usuario provea coordenadas `signature_x/y/width/height` por formulario.

### Flujo de calibración después del deploy

```text
1. Crear reclamo de prueba (ej. GNP reembolso)
2. Generar PDF y abrirlo
3. Comparar visualmente con el original
4. Ajustar x,y de cada campo desviado en formCoordinates.ts
5. Repetir hasta alineación perfecta
```

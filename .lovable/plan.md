
Voy a investigar el estado actual antes de proponer cambios concretos. Necesito ver:
1. El `generateFilledPDF.ts` actual y `buildOverlayData`
2. El `registry.ts` con `getFormKey` (¿devuelve "GNP_aviso_accidente" o "gnp_aviso_accidente"?)
3. El `formCoordinates.ts` actual (¿qué keys usa?)
4. Los flujos de descarga en `NewClaim.tsx`, `EditClaim.tsx`, `Claims.tsx`
5. Verificar que los PDFs estén en Storage con esos paths
<lov-tool-use id="toolu_vrtx_01EXoDqfRZLBCVPTXPmkv4SS" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/formCoordinates.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01NivN6GJra12tKoPokvDVjs" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/generateFilledPDF.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WXSLRqTkguTgvwkyaU7MZL" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/NewClaim.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01M9Tzf6hGzqPzjar1kULVW8" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/EditClaim.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Kyr9mFWe6ZAXuXXXkAFxT5" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Claims.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01S6SKeu1BUvepXCWNzxdADP" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/formCoordinates.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01GndpqLgbDzfsAEGdMm43Tg" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/generateFilledPDF.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01NSvdoYAhcJXFFdxcTLuMEf" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/claims/forms/registry.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01CLZ54DZDXYThLoHdb8f6aT" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/NewClaim.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SXweg69iDk1q73uRFh3gYD" name="code--view" integration-id="code" data="{\"file_path\": \"src/pages/Claims.tsx\"}">
</lov-tool-use>
Tengo toda la información necesaria. El sistema está casi completo, pero el usuario quiere alinear las **convenciones de keys exactamente** como las del spec (`GNP_aviso_accidente` con guión bajo y mayúsculas) y refinar el mapeo. Identifico las brechas reales contra el flujo actual.

<lov-plan>

## Diagnóstico del estado actual

El sistema **ya está implementado** y conectado correctamente:
- `pdfFiller.ts`, `generateFilledPDF.ts`, `formCoordinates.ts` existen
- `getFormKey(insurer, tramite)` mapea póliza+trámite → key de coordenadas
- `NewClaim.handleGenerate` usa `generateFilledPDF` con fallback a jsPDF
- `Claims.handleDownloadOriginalPDF` (botón "Formato") ya usa el flujo nuevo
- `Claims.handleDownloadSubmittedPDF` (botón en "Enviados") ya regenera con `generateFilledPDF`

Entonces ¿por qué el usuario sigue viendo el PDF genérico? Las dos causas reales:

1. **Tabla `claims` legacy** — el botón "Resumen" (`handleDownloadPDF`) sigue llamando a `generateClaimPDF` (jsPDF). Si el usuario aprieta ese, ve el genérico. Hay que **eliminar ese botón** o redirigirlo al flujo oficial.
2. **Caída silenciosa al fallback en `NewClaim`** — si `generateFilledPDF` lanza (PDF no existe en bucket, key no mapeada, error de fetch), cae a jsPDF mostrando "PDF original no disponible". El usuario probablemente está viendo esto sin notar el toast.

Además el spec del usuario pide alinearse a una **convención de keys mayúsculas con guión bajo** (`GNP_aviso_accidente` en vez de `gnp_aviso_accidente`). Hoy todo está en minúsculas y funciona, pero unificar a la convención del spec hace el código auto-documentado.

## Cambios a realizar

### 1. `src/lib/formCoordinates.ts`
Renombrar todas las keys de minúsculas a la convención `ASEGURADORA_tipo`:
- `gnp_aviso_accidente` → `GNP_aviso_accidente`
- `gnp_informe_medico` → `GNP_informe_medico`
- `axa_reembolso` → `AXA_reembolso`
- `metlife_reembolso` → `METLIFE_reembolso`
- `banorte_informe_reclamante` → `BANORTE_informe_reclamante`
- `bbva_informe_medico` → `BBVA_informe_medico`
- `mapfre_reembolso` → `MAPFRE_reembolso`
- `allianz_informe_medico` → `ALLIANZ_informe_medico`
- (y las plantillas base de Inbursa, Plan Seguro, Seguros Monterrey)

### 2. `src/components/claims/forms/registry.ts`
Actualizar `formKeyMatrix` para apuntar a las nuevas keys mayúsculas en cada combinación insurer/tramite.

### 3. `src/pages/NewClaim.tsx` — `handleGenerate`
- Cambiar fallback silencioso por **error explícito**: si `getFormKey` retorna null o `generateFilledPDF` lanza, mostrar `toast.error("No hay formato oficial disponible para [aseguradora]")` y **detener** la generación, en lugar de caer a jsPDF.
- Mantener `generateFormPDF` (jsPDF) solo como fallback opcional bajo flag, no por defecto.

### 4. `src/pages/Claims.tsx`
- **Eliminar botón "Resumen"** (que llama `handleDownloadPDF` con `generateClaimPDF`) para que el usuario nunca descargue el PDF genérico desde la lista de reclamos.
- Mantener solo "Formato" (oficial) + "Editar" + "Eliminar".
- Limpiar import no usado de `generateClaimPDF`.

### 5. `src/pages/EditClaim.tsx`
- Mismo tratamiento: si tiene botón de "Descargar Resumen" con jsPDF, redirigirlo o eliminarlo. Verificar y aplicar igual que en `Claims.tsx`.

### 6. Mejoras en `buildOverlayData` (generateFilledPDF.ts)
Agregar las claves del spec que aún no están totalmente cubiertas:
- `nombres` como alias adicional
- `celular` (separado de `telefono`)
- `municipio`, `estado` (sin prefijo `dom_`)
- `nombre_contratante` con concatenación apellido_paterno + apellido_materno + nombres si no hay `policy.contractor_name`
- Asegurar que `total_gastos` también se exponga como `total_reclamado`

## Archivos modificados

```text
edita: src/lib/formCoordinates.ts          (keys → MAYÚSCULAS_tipo)
edita: src/components/claims/forms/registry.ts  (formKeyMatrix → nuevas keys)
edita: src/lib/generateFilledPDF.ts        (alias adicionales en overlay)
edita: src/pages/NewClaim.tsx              (sin fallback silencioso)
edita: src/pages/Claims.tsx                (quitar botón "Resumen", limpiar imports)
edita: src/pages/EditClaim.tsx             (quitar PDF genérico si aplica)
```

## Notas importantes

- **Compatibilidad**: como las keys son strings internos, renombrarlas es seguro siempre que `formCoordinates`, `getFormKey` y `FormCoordinatesKey` (tipo) queden alineados — TypeScript marcará cualquier desfase.
- **Coordenadas siguen siendo aproximadas**: este cambio NO mueve un solo punto x/y. Es trabajo de calibración fina posterior, campo por campo.
- **PDFs faltantes**: las plantillas de Inbursa, Plan Seguro, Seguros Monterrey, Allianz aviso/identificación/carta_remesa, Banorte informe_medico, GNP informe_medico (página 2 del spec), AXA programación, METLIFE programación/consentimiento — sus storagePaths quedan registrados pero las coordenadas son placeholders mínimos. El usuario debe calibrarlas viendo el PDF original.
- **Resultado esperado tras este cambio**: cualquier botón de descarga en `/reclamos`, `/reclamos/nuevo` o `/reclamos/editar/[id]` siempre intentará el formato oficial; si no hay plantilla configurada para esa aseguradora, mostrará error claro en lugar de un PDF genérico.


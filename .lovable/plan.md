

El usuario quiere implementar un sistema de llenado de PDFs originales usando pdf-lib con coordenadas absolutas. Las Partes 1 y 2 (Perfil y Pólizas) ya están implementadas según el historial. Voy a verificar el estado actual y enfocar el plan en la Parte 3 que es la novedad real.

Verifico estado actual de Profile, Policies, y el wizard.

Estado verificado:
- Perfil ya tiene: estado_civil, giro_negocio, es_pep, cargo_pep, tipo_identificacion, numero_identificacion, vigencia_identificacion, telefono_celular ✓
- Pólizas ya tiene: numero_certificado, tipo_contratacion, deducible, coaseguro_porcentaje, tope_coaseguro, agente_* ✓
- Aseguradoras como SELECT con las 10 opciones ✓
- Wizard dinámico con 8 formularios A-H y generación de PDF "desde cero" con jsPDF ✓
- Bucket "documents" existe, NO existe bucket "formatos"
- pdf-lib NO está instalado (solo jspdf)

Por lo tanto el trabajo real es solo la PARTE 3: cambiar el motor de PDF de "generar desde cero" a "rellenar PDF original con coordenadas".

Ámbito reducido y claro.

## Plan: Llenado de PDFs originales por coordenadas (pdf-lib)

Las Partes 1 y 2 ya están implementadas. Solo se ejecuta la Parte 3.

### 1. Infraestructura

**Bucket nuevo `formatos` (público)** vía migración SQL + políticas de lectura pública. El usuario sube manualmente los 23 PDFs originales con los paths exactos especificados (no podemos subir binarios desde código).

**Dependencia**: instalar `pdf-lib`.

### 2. Archivos nuevos

**`src/lib/pdfFiller.ts`** — `fillPDF(pdfBytes, fields)` y `drawCheckmark(...)` exactamente como el spec del usuario, usando Helvetica embebida y `page.drawText` con coordenadas absolutas (origen inferior izquierda).

**`src/lib/formCoordinates.ts`** — diccionario completo con las coordenadas provistas por el usuario para los 13 formularios listados:
- gnp_aviso_accidente, gnp_informe_medico
- axa_reembolso
- metlife_reembolso
- banorte_informe_reclamante
- bbva_informe_medico
- mapfre_reembolso
- allianz_informe_medico, inbursa_informe_medico, plan_seguro_informe_medico, seguros_monterrey_informe_medico (plantillas base)

**`src/lib/generateFilledPDF.ts`** — `generateFilledPDF(formKey, formData)` que descarga el PDF de Storage, aplana fields/page1Fields/page2Fields/page3Fields, mapea valores y llama a `fillPDF`. Más helper `downloadPDF(bytes, filename)`.

### 3. Mapeo aseguradora+trámite → formKey

En `src/components/claims/forms/registry.ts` agregar exportación `getFormKey(insurer, tramite)` con la tabla:

```text
GNP + aviso_accidente        → gnp_aviso_accidente
GNP + informe_medico         → gnp_informe_medico
AXA + reembolso              → axa_reembolso
METLIFE + reembolso          → metlife_reembolso
BANORTE + informe_reclamante → banorte_informe_reclamante
BBVA + informe_medico        → bbva_informe_medico
MAPFRE + reembolso           → mapfre_reembolso
ALLIANZ + informe_medico     → allianz_informe_medico
INBURSA + informe_medico     → inbursa_informe_medico
PLAN SEGURO + informe_medico → plan_seguro_informe_medico
SEGUROS MONTERREY + informe_medico → seguros_monterrey_informe_medico
```

### 4. Mapeo de datos del wizard → keys de coordenadas

Función `buildOverlayData(definition, data, profile, policy)` en `src/lib/generateFilledPDF.ts` que traduce los campos del wizard (ej. `paternal_surname`, `policy_number`, `cause`, etc.) a las keys que esperan las coordenadas (`apellido_paterno`, `numero_poliza`, `check_causa_accidente`, etc.).

Maneja:
- Strings directos
- Checkboxes (valor "X" si está seleccionado, "" si no)
- RFC letra-por-letra (descompone `RFC` en `rfc_l1..rfc_h3` para GNP)
- Fechas día/mes/año (descompone DOB en `fecha_nac_dia/mes/año`)
- Edad calculada
- Total de gastos sumado

### 5. Cambio en `src/pages/NewClaim.tsx`

Reemplazar `handleGenerate` (que usaba `generateFormPDF` jsPDF) por:
1. Llamar `getFormKey(insurer, tramite)`
2. Si existe → `generateFilledPDF(formKey, buildOverlayData(...))` y `downloadPDF(...)`
3. Si no existe → fallback al generador jsPDF actual (para los formularios sin PDF original mapeado: D, E, F, G, H que el usuario no listó completos)
4. Subir el resultado al bucket `documents`, generar folio, marcar `claim_forms.status='submitted'`

### 6. Archivos modificados/creados

```text
nuevo:    supabase/migrations/<ts>_formatos_bucket.sql
nuevo:    src/lib/pdfFiller.ts
nuevo:    src/lib/formCoordinates.ts
nuevo:    src/lib/generateFilledPDF.ts
edita:    package.json (pdf-lib)
edita:    src/components/claims/forms/registry.ts (getFormKey)
edita:    src/pages/NewClaim.tsx (handleGenerate)
```

### 7. Acción manual del usuario

Tras desplegar, el usuario debe subir los 23 PDFs originales al bucket `formatos` con los paths exactos. Le doy un enlace al bucket en el mensaje de finalización.

### Fuera de alcance
- Calibración fina de coordenadas (el propio spec advierte que son aproximadas y se ajustan después comparando visualmente)
- Coordenadas para formularios D, E, F, G, H completos (el spec solo listó plantillas base)
- Firma digital embebida como imagen en el PDF original (queda como "X" o se omite si el usuario no provee coordenadas para imagen)


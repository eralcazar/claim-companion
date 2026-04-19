

## Objetivo

El segundo combo (trámite) debe mostrar **solo los formatos PDF reales** que existen en `formatos/<ASEGURADORA>/` en Storage, no una lista genérica derivada de `TRAMITE_TYPES`.

## Problema actual

Hoy `getAvailableTramites(insurer)` devuelve claves de `TRAMITE_TYPES` (reembolso, prog_cirugia, indemnizacion, reporte_hospitalario...) mapeadas en `formKeyMatrix`. Eso obliga a inventar mapeos artificiales (ej. ALLIANZ usa `informe_medico` para "reembolso" y "prog_cirugia" — los dos llevan al mismo PDF). El usuario ve duplicados y opciones que no corresponden a archivos reales.

La realidad de Storage es plana: cada aseguradora tiene 1–4 PDFs con nombres fijos (`reembolso`, `informe_medico`, `aviso_accidente`, `programacion_servicios`, `consentimiento_informado`, `carta_remesa`, `identificacion_cliente`, `informe_reclamante`).

## Solución

### 1. Nuevo modelo: el trámite ES el archivo

Reemplazar `formKeyMatrix` (insurer × tramite → key) por un catálogo directo `insurerFormats` (insurer → lista de archivos reales):

```ts
const insurerFormats: Record<string, Array<{ id: string; label: string; file: string }>> = {
  ALLIANZ: [
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
    { id: "aviso_accidente",       label: "Aviso de Accidente",    file: "aviso_accidente.pdf" },
    { id: "carta_remesa",          label: "Carta Remesa",          file: "carta_remesa.pdf" },
    { id: "identificacion_cliente",label: "Identificación Cliente",file: "identificacion_cliente.pdf" },
  ],
  AXA: [
    { id: "reembolso",             label: "Reembolso",             file: "reembolso.pdf" },
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
    { id: "programacion_servicios",label: "Programación de Servicios", file: "programacion_servicios.pdf" },
  ],
  BANORTE: [
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
    { id: "informe_reclamante",    label: "Informe del Reclamante",file: "informe_reclamante.PDF" }, // mayúsculas
  ],
  BBVA: [
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
  ],
  GNP: [
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
    { id: "aviso_accidente",       label: "Aviso de Accidente",    file: "aviso_accidente.pdf" },
  ],
  INBURSA: [
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
    { id: "aviso_accidente",       label: "Aviso de Accidente",    file: "aviso_accidente.pdf" },
  ],
  MAPFRE: [
    { id: "reembolso",             label: "Reembolso",             file: "reembolso.pdf" },
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
  ],
  METLIFE: [
    { id: "reembolso",             label: "Reembolso",             file: "reembolso.pdf" },
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
    { id: "programacion_servicios",label: "Programación de Servicios", file: "programacion_servicios.pdf" },
    { id: "consentimiento_informado", label: "Consentimiento Informado", file: "consentimiento_informado.pdf" },
  ],
  "PLAN SEGURO": [
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
  ],
  "SEGUROS MONTERREY": [
    { id: "informe_medico",        label: "Informe Médico",        file: "informe_medico.pdf" },
    { id: "aviso_accidente",       label: "Aviso de Accidente",    file: "aviso_accidente.pdf" },
  ],
};
```

Total: **23 entradas**, una por archivo en Storage.

### 2. API pública del registry

```ts
getAvailableFormats(insurer): Array<{id, label, file}>   // ← reemplaza getAvailableTramites
getFormKey(insurer, formatId): string | null              // sigue devolviendo "METLIFE_reembolso" para coordenadas
getFormDefinition(insurer, formatId): FormDefinition|null // lookup por id de formato
```

`getFormKey` se mapea simple: `${INSURER_NORMALIZED}_${formatId}` (ej. `PLAN_SEGURO_informe_medico`). Esas son las keys que ya existen en `src/lib/formCoordinates.ts`.

### 3. Cambios en `NewClaim.tsx`

- El segundo select itera sobre `getAvailableFormats(insurer)` y muestra `label`.
- El estado `tramite` ahora guarda el `id` del formato (ej. `"informe_medico"`, `"aviso_accidente"`) en lugar de un `TramiteType` global.
- Si la aseguradora no está en el catálogo → mensaje "Esta aseguradora no tiene formatos cargados".

### 4. Compatibilidad con código existente

- `TRAMITE_TYPES` en `constants.ts` se conserva (lo usa `Claims.tsx` para etiquetas históricas y la columna `claim_type` en BD).
- `getFormDefinition` recibe el nuevo `formatId`; el mapeo a definición A/B/C/D/E/F/G/H se hace con una tabla pequeña por (insurer, formatId).
- `EditClaim.tsx` no se toca: lee `claim.claim_type` ya guardado.

## Archivos a modificar

```text
edita: src/components/claims/forms/registry.ts   (catálogo insurerFormats + nueva API)
edita: src/pages/NewClaim.tsx                    (segundo select usa getAvailableFormats)
```

## Notas

- No se crean ni renombran archivos en Storage.
- No se tocan coordenadas; las keys ya coinciden (`METLIFE_reembolso`, `BANORTE_informe_reclamante`, etc.).
- Banorte `informe_reclamante.PDF` se respeta en mayúsculas dentro del campo `file`.


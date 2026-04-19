

## Objetivo

Reordenar el wizard de `/reclamos/nuevo`: **primero póliza, luego trámite filtrado** según los formatos disponibles en Storage para esa aseguradora.

## Estado actual

En `src/pages/NewClaim.tsx` (paso 0) hay dos selects independientes:
1. Tipo de trámite (lista fija completa de `TRAMITE_TYPES`)
2. Póliza

El usuario puede elegir cualquier trámite aunque la aseguradora no tenga ese formato → cae en error "No hay formato configurado".

## Solución

### 1. Invertir orden en `NewClaim.tsx` paso 0

```text
[ Póliza ▼ ]   ← primero, obligatorio
[ Trámite ▼ ]  ← deshabilitado hasta elegir póliza; opciones filtradas
```

### 2. Filtrado dinámico de trámites

Añadir helper `getAvailableTramites(insurer)` en `src/components/claims/forms/registry.ts` que devuelva solo las claves de `formKeyMatrix[insurer]` cuyo PDF existe (o sea, las que ya están en la matriz). Ejemplo:
- METLIFE → `[reembolso, prog_cirugia, prog_servicios, prog_medicamentos, indemnizacion, reporte_hospitalario]`
- BBVA → `[reembolso, prog_*, indemnizacion, reporte_hospitalario]` (todas mapeadas a `BBVA_informe_medico`)
- GNP → solo los que tienen entrada

El select de trámite usa esa lista filtrada en lugar de `TRAMITE_TYPES` completo.

### 3. UX

- Al cambiar de póliza, **resetear** `tramite` (porque las opciones cambian).
- Mostrar mensaje "Selecciona primero una póliza" si `policyId` está vacío.
- Si la aseguradora no tiene ningún formato, mostrar aviso claro.

## Archivos a modificar

```text
edita: src/components/claims/forms/registry.ts   (+ getAvailableTramites helper)
edita: src/pages/NewClaim.tsx                    (invertir orden paso 0 + filtrado)
```

## Notas

- No toca coordenadas ni Storage.
- No toca `EditClaim.tsx` (ahí póliza+trámite ya vienen del reclamo existente).
- `TRAMITE_TYPES` se sigue usando como fuente de labels; el helper solo filtra.


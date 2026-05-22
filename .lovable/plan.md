## Renombrar "Reclamo/Reclamos" → "Solicitud/Solicitudes" en la UI

Reemplazo de la palabra **solo en textos visibles** en español. **No** se cambian:
- Identificadores de código (variables, componentes `Claims`, tipos, props).
- Nombres de tablas, columnas o funciones de DB (`claims`, `claim_documents`, etc.).
- Rutas (`/reclamos`, `/reclamos/nuevo`, `/reclamos/editar/:id`) — cambiarlas rompería enlaces externos y bookmarks.
- Nombres de archivos (`Claims.tsx`, `NewClaim.tsx`, etc.).

### Reglas de reemplazo (preservando capitalización)

| Antes | Después |
|---|---|
| Reclamos | Solicitudes |
| reclamos | solicitudes |
| Reclamo | Solicitud |
| reclamo | solicitud |
| Nuevo Reclamo | Nueva Solicitud |
| Sin reclamos | Sin solicitudes |
| Reclamos sin informe | Solicitudes sin informe |

### Archivos a tocar (solo strings de UI)

- `src/components/BottomNav.tsx` — label "Reclamos"
- `src/components/AppSidebar.tsx` — label "Reclamos"
- `src/pages/Dashboard.tsx` — "Nuevo Reclamo", "Reclamos Recientes", "Sin reclamos"
- `src/pages/Claims.tsx` — título, botones, textos vacíos
- `src/pages/NewClaim.tsx` — títulos, breadcrumbs, toasts
- `src/pages/EditClaim.tsx` — títulos, toasts
- `src/pages/NewClaimLegacy.tsx` — títulos
- `src/pages/Landing.tsx` — sección Brokers/Pacientes (textos visibles)
- `src/pages/Login.tsx` — textos visibles
- `src/pages/Legal.tsx` — textos visibles
- `src/pages/medico/ClaimsWithoutReport.tsx` — "Reclamos sin informe"
- `src/pages/admin/FormatManager.tsx` — textos visibles
- `src/pages/FirmasManager.tsx` — textos visibles
- `src/components/claims/StepClaimType.tsx` — textos visibles
- `src/components/claims/StepInvoices.tsx` — textos visibles
- `src/lib/features.ts` y `src/lib/constants.ts` — solo `label`/`description` visibles; las **keys** se mantienen

### Proceso

1. Revisar cada archivo y reemplazar únicamente strings entre comillas que se muestran al usuario (JSX text, `label:`, `title:`, `placeholder=`, `toast(...)`).
2. No tocar comentarios de código, claves de objeto, nombres de variables, ni feature flags.
3. Verificar build después del sweep.

### Pregunta abierta

Las rutas `/reclamos*` se conservan tal cual. Si más adelante quieres también renombrarlas a `/solicitudes*` (con redirects), lo haremos en un cambio aparte.



## Plan: Agregar RFC del titular en pólizas y PDF MetLife

**Objetivo:** Agregar campo RFC del titular en el registro de póliza y usarlo en la Sección 2 del PDF MetLife Reembolso.

### Paso 1 — Migración de base de datos

```sql
ALTER TABLE public.insurance_policies
  ADD COLUMN titular_rfc text DEFAULT '';
```

### Paso 2 — Formulario de póliza (`src/pages/Policies.tsx`)

- Agregar `titular_rfc` al `EMPTY_FORM`, al payload de save, y a `openEdit`.
- Agregar campo de input "RFC" en la sección "Datos del Asegurado Titular".

### Paso 3 — PDF (`src/components/claims/fillOriginalPDF.ts`)

- Agregar `titular_rfc` a la interfaz `PolicyData`.
- Cambiar línea 107 para usar el RFC de la póliza con fallback al perfil:
  ```typescript
  setField(pdfForm, "Registro Federal de Contribuyentes RFC", policy.titular_rfc || profile.rfc || "");
  ```

### Archivos a modificar
- DB migration (nueva columna)
- `src/pages/Policies.tsx` — campo RFC en formulario del titular
- `src/components/claims/fillOriginalPDF.ts` — usar `policy.titular_rfc`


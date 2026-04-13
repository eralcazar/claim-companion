

## Plan: Agregar sección "Datos del Titular" al registro de póliza

**Objetivo:** Almacenar los datos del asegurado titular directamente en la póliza (no del perfil), y usarlos para llenar la Sección 2 del PDF MetLife.

### Paso 1 — Migración de base de datos

Agregar 8 columnas a `insurance_policies`:

```sql
ALTER TABLE insurance_policies
  ADD COLUMN titular_paternal_surname text DEFAULT '',
  ADD COLUMN titular_maternal_surname text DEFAULT '',
  ADD COLUMN titular_first_name text DEFAULT '',
  ADD COLUMN titular_dob date,
  ADD COLUMN titular_birth_country text DEFAULT 'México',
  ADD COLUMN titular_birth_state text DEFAULT '',
  ADD COLUMN titular_nationality text DEFAULT 'Mexicana',
  ADD COLUMN titular_occupation text DEFAULT '';
```

### Paso 2 — Formulario de póliza (`src/pages/Policies.tsx`)

- Agregar campos al `EMPTY_FORM` y al formulario para la sección "Datos del Titular": apellido paterno, materno, nombres, fecha de nacimiento, país de nacimiento, estado de nacimiento, nacionalidad, ocupación.
- Incluir estos campos en el payload de insert/update y en `openEdit`.

### Paso 3 — Actualizar PDF (`src/components/claims/fillOriginalPDF.ts`)

- Agregar los campos del titular a `PolicyData`.
- En `fillMetLifeFields`, usar los datos del titular de la póliza en vez del perfil para la Sección 2:
  - `policy.titular_paternal_surname` → "Apellido paterno"
  - `policy.titular_first_name` → "Nombres"
  - `policy.titular_dob` → DIAASEG/MESASEG/AASEG
  - `policy.titular_birth_country` → PAISNAC1
  - etc.

### Paso 4 — Pasar datos del titular desde Claims/NewClaim/EditClaim

- Actualizar las queries de claims que hacen `select("*, insurance_policies(...)")` para incluir los nuevos campos.
- Pasar los campos del titular en el objeto `PolicyData` al llamar `fillOriginalPDF`.

### Archivos a modificar
- `src/pages/Policies.tsx` — formulario con sección de datos del titular
- `src/components/claims/fillOriginalPDF.ts` — usar datos de la póliza para Sección 2
- `src/pages/Claims.tsx` — pasar datos del titular al generar PDF
- `src/pages/NewClaim.tsx` — pasar datos del titular al generar PDF
- `src/pages/EditClaim.tsx` — pasar datos del titular al generar PDF


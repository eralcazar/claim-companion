

## Plan: Agregar campos de perfil para Sección 3 del PDF MetLife

**Objetivo:** Agregar "Parentesco con el asegurado titular" y "Número de certificado" al perfil del usuario, y completar el mapeo de la Sección 3 (Asegurado Afectado) del PDF MetLife cuando el paciente ES el titular.

### Paso 1 — Migración de base de datos

Agregar 2 columnas a `profiles`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN certificate_number text DEFAULT '',
  ADD COLUMN relationship_to_titular text DEFAULT '';
```

### Paso 2 — Perfil (`src/pages/Profile.tsx`)

- Agregar `certificate_number` y `relationship_to_titular` al `INITIAL_FORM` y al `useEffect` de hidratación.
- Agregar campos de input en la sección "Datos Personales": "No. de Certificado" y "Parentesco con el Asegurado Titular".

### Paso 3 — PDF (`src/components/claims/fillOriginalPDF.ts`)

- Agregar `certificate_number` y `relationship_to_titular` a `ProfileData`.
- Completar la Sección 3 cuando `patient_is_titular === true` para incluir los campos faltantes:
  ```typescript
  if (form.patient_is_titular) {
    setField(pdfForm, "Apellido paterno_2", profile.paternal_surname);
    setField(pdfForm, "Apellido materno_2", profile.maternal_surname);
    setField(pdfForm, "Nombres_2", profile.first_name);
    // Campos faltantes — ahora mapeados desde perfil:
    if (profile.date_of_birth) {
      const [py, pm, pd] = profile.date_of_birth.split("-");
      setField(pdfForm, "DIAPAC", pd);
      setField(pdfForm, "MESPEC", pm);
      setField(pdfForm, "APAC", py);
    }
    setField(pdfForm, "PAISNAC2", profile.birth_country || "");
    setField(pdfForm, "EDONAC2", profile.birth_state || "");
    setField(pdfForm, "OCUPAC2", profile.occupation || "");
    setField(pdfForm, "CERTIF", profile.certificate_number || "");
    setField(pdfForm, "PARENTESCO", profile.relationship_to_titular || "");
  }
  ```
- En el caso `patient_is_titular === false`, los datos ya se toman del formulario del claim (sin cambios).

### Paso 4 — StepPatientInfo

- Cuando el paciente NO es el titular, los campos de parentesco y certificado ya existen en el formulario del claim (`patient_certificate_number`, `patient_relationship`). Sin cambios necesarios.

### Archivos a modificar
- DB migration (2 columnas en `profiles`)
- `src/pages/Profile.tsx` — campos nuevos
- `src/components/claims/fillOriginalPDF.ts` — mapeo completo Sección 3


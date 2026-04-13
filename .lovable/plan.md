

## Plan: Sección 3 siempre desde perfil, eliminar paso "Datos del Paciente"

**Objetivo:** La Sección 3 (Asegurado Afectado) del PDF MetLife siempre tomará los datos del perfil del usuario. Se elimina el paso "Datos del Paciente" (con la pregunta "¿Es el titular?") del wizard de reclamos MetLife.

### Paso 1 — Eliminar paso "Datos del Paciente" del wizard

En `src/pages/NewClaim.tsx` y `src/pages/EditClaim.tsx`:
- Eliminar el bloque condicional `if (isMetLife) { steps.push({ title: "Datos del Paciente", ... }) }`.
- Eliminar el import de `StepPatientInfo`.

### Paso 2 — PDF: Sección 3 siempre desde perfil

En `src/components/claims/fillOriginalPDF.ts` (líneas 131-162):
- Eliminar el condicional `if (form.patient_is_titular) / else`.
- Siempre llenar la Sección 3 desde los datos del perfil:
  ```typescript
  // Section 3: Always from profile
  setField(pdfForm, "Apellido paterno_2", profile.paternal_surname);
  setField(pdfForm, "Apellido materno_2", profile.maternal_surname);
  setField(pdfForm, "Nombres_2", profile.first_name);
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
  ```

### Archivos a modificar
- `src/pages/NewClaim.tsx` — eliminar paso StepPatientInfo
- `src/pages/EditClaim.tsx` — eliminar paso StepPatientInfo
- `src/components/claims/fillOriginalPDF.ts` — Sección 3 siempre desde perfil


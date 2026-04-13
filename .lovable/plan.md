

## Plan: Agregar campos faltantes del titular en el PDF de MetLife

**Problema:** En la Sección 2 del PDF de MetLife (Datos del Asegurado Titular), no se llenan los campos: País de nacimiento, Estado de nacimiento, Nacionalidad y Ocupación, aunque existen en el perfil del usuario.

**Causa raíz:** 
1. La interfaz `ProfileData` en `fillOriginalPDF.ts` no incluye `birth_country`, `birth_state`, `nationality` ni `occupation`.
2. La función `fillMetLifeFields` no llama a `setField` para esos campos del titular.

### Cambios

**Archivo: `src/components/claims/fillOriginalPDF.ts`**

1. Agregar a `ProfileData` los campos faltantes:
   - `birth_country?: string | null`
   - `birth_state?: string | null`
   - `nationality?: string | null`
   - `occupation?: string | null`

2. En `fillMetLifeFields`, después de la línea del DOB del titular (línea ~100), agregar las llamadas para llenar los campos del formulario PDF:
   ```typescript
   setField(pdfForm, "PAISNAC", profile.birth_country || "");
   setField(pdfForm, "EDONAC", profile.birth_state || "");
   setField(pdfForm, "NACIONALIDAD", profile.nationality || "");
   setField(pdfForm, "OCUPAC", profile.occupation || "");
   ```
   (Los IDs de campo pueden necesitar ajuste según los nombres reales en el PDF de MetLife.)

No se requieren cambios en base de datos ni en otros archivos — los datos ya se guardan en `profiles` y se pasan al PDF.


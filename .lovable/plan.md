

## Plan: Corregir mapeo de campos Sección 3 del PDF MetLife Reembolso

**Problema:** Los campos de País de nacimiento, Estado de nacimiento, Ocupación, No. de Certificado y Parentesco no se llenan en la Sección 3 del PDF porque los nombres de campo internos del PDF probablemente no coinciden con los que estamos usando ("PAISNAC2", "EDONAC2", "OCUPAC2", "CERTIF", "PARENTESCO").

La función `setField` silenciosamente ignora los errores cuando un campo no existe (`catch { /* skip */ }`), por lo que no hay error visible pero los datos no se escriben.

### Paso 1 — Inspeccionar el PDF real

Ejecutar un script que lea el archivo `/public/forms/METLIFE_REEMBOLSO.pdf` y liste TODOS los campos del formulario con sus nombres exactos, tipos y posiciones. Esto revelará los nombres correctos para los campos de la Sección 3.

### Paso 2 — Corregir nombres de campos en fillOriginalPDF.ts

En `src/components/claims/fillOriginalPDF.ts` (líneas 141-145), reemplazar los nombres de campo incorrectos por los nombres reales encontrados en el PDF:

```typescript
// Líneas actuales con nombres posiblemente incorrectos:
setField(pdfForm, "PAISNAC2", profile.birth_country || "");
setField(pdfForm, "EDONAC2", profile.birth_state || "");
setField(pdfForm, "OCUPAC2", profile.occupation || "");
setField(pdfForm, "CERTIF", profile.certificate_number || "");
setField(pdfForm, "PARENTESCO", profile.relationship_to_titular || "");
```

Se actualizarán con los nombres exactos del PDF.

### Archivos a modificar
- `src/components/claims/fillOriginalPDF.ts` — corregir nombres de campos de la Sección 3


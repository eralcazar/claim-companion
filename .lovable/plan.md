

## Plan: Mapear Sección 4 (Contacto del Titular) desde datos de la póliza

**Problema:** La Sección 4 del PDF MetLife Reembolso ("Datos de contacto del Asegurado Titular") actualmente toma los datos del perfil del paciente, pero debería tomar los datos del titular guardados en la póliza. Además, faltan campos por mapear (`Ciudad / Población`, teléfono fijo `TEL2`, prefijo internacional).

### Paso 1 — Ampliar `PolicyData` en `fillOriginalPDF.ts`

Agregar los 14 campos nuevos del titular a la interfaz `PolicyData`:

```typescript
titular_street?: string | null;
titular_ext_number?: string | null;
titular_int_number?: string | null;
titular_postal_code?: string | null;
titular_neighborhood?: string | null;
titular_municipality?: string | null;
titular_city?: string | null;
titular_state?: string | null;
titular_country?: string | null;
titular_cell_phone?: string | null;
titular_landline?: string | null;
titular_intl_prefix?: string | null;
titular_email?: string | null;
titular_auth_contact?: boolean | null;
```

### Paso 2 — Cambiar mapeo de Sección 4 a datos de póliza

En `fillMetLifeFields`, reemplazar las líneas 147-157 para usar `policy` en vez de `profile`:

```typescript
// Section 4: Titular contact (from policy)
setField(pdfForm, "Calle  Avenida", policy.titular_street || "");
setField(pdfForm, "Exterior", policy.titular_ext_number || "");
setField(pdfForm, "Interior", policy.titular_int_number || "");
setField(pdfForm, "Colonia  Barrio", policy.titular_neighborhood || "");
setField(pdfForm, "Código postal", policy.titular_postal_code || "");
setField(pdfForm, "Municipio  Alcaldía", policy.titular_municipality || "");
setField(pdfForm, "Ciudad  Población", policy.titular_city || "");
setField(pdfForm, "Estado  Provincia", policy.titular_state || "");
setField(pdfForm, "País", policy.titular_country || "México");
setField(pdfForm, "Celular", policy.titular_cell_phone || "");
setField(pdfForm, "TEL2", policy.titular_landline || "");
setField(pdfForm, "undefined_2", policy.titular_intl_prefix || "");
setField(pdfForm, "PRE", policy.titular_email || "");
```

### Paso 3 — Pasar campos nuevos desde las 3 páginas

En `NewClaim.tsx`, `EditClaim.tsx` y `Claims.tsx`, agregar los 14 campos nuevos al objeto `PolicyData` que se pasa a `fillOriginalPDF`:

```typescript
titular_street: pol.titular_street,
titular_ext_number: pol.titular_ext_number,
titular_int_number: pol.titular_int_number,
titular_postal_code: pol.titular_postal_code,
titular_neighborhood: pol.titular_neighborhood,
titular_municipality: pol.titular_municipality,
titular_city: pol.titular_city,
titular_state: pol.titular_state,
titular_country: pol.titular_country,
titular_cell_phone: pol.titular_cell_phone,
titular_landline: pol.titular_landline,
titular_intl_prefix: pol.titular_intl_prefix,
titular_email: pol.titular_email,
titular_auth_contact: pol.titular_auth_contact,
```

### Archivos a modificar
- `src/components/claims/fillOriginalPDF.ts` — ampliar PolicyData + cambiar mapeo Sección 4
- `src/pages/NewClaim.tsx` — pasar campos nuevos
- `src/pages/EditClaim.tsx` — pasar campos nuevos
- `src/pages/Claims.tsx` — pasar campos nuevos


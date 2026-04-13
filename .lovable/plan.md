

## Plan: Corregir mapeo del campo "Correo electrónico" en PDF MetLife

**Problema:** El campo "Correo electrónico" del PDF está dividido en dos campos internos: `undefined_2` (parte antes del @) y `undefined_3` (parte después del @). Actualmente, el email se está escribiendo en el campo `PRE` que en realidad es el prefijo del teléfono celular, y `undefined_2` se usa para el prefijo internacional — ambos están mal asignados.

### Campos reales del PDF (por posición en página 0)

| Campo PDF | Posición Y | Uso real |
|-----------|-----------|----------|
| `Celular` | ~191 | Teléfono celular |
| `PRE` | ~191 | Prefijo celular (ej: +52) |
| `TEL2` | ~192 | Teléfono fijo |
| `undefined_2` | ~152 | Correo electrónico (parte antes del @) |
| `undefined_3` | ~152 | Correo electrónico (parte después del @) |

### Cambios en `src/components/claims/fillOriginalPDF.ts`

Líneas 171-174, reemplazar:

```typescript
// ANTES (incorrecto):
setField(pdfForm, "Celular", policy.titular_cell_phone || "");
setField(pdfForm, "TEL2", policy.titular_landline || "");
setField(pdfForm, "undefined_2", policy.titular_intl_prefix || "");
setField(pdfForm, "PRE", policy.titular_email || "");

// DESPUÉS (correcto):
setField(pdfForm, "PRE", policy.titular_intl_prefix || "");
setField(pdfForm, "Celular", policy.titular_cell_phone || "");
setField(pdfForm, "TEL2", policy.titular_landline || "");
// Email: split at @ into two fields
const email = policy.titular_email || "";
const atIdx = email.indexOf("@");
if (atIdx > -1) {
  setField(pdfForm, "undefined_2", email.substring(0, atIdx));
  setField(pdfForm, "undefined_3", email.substring(atIdx + 1));
} else {
  setField(pdfForm, "undefined_2", email);
}
```

### Archivo a modificar
- `src/components/claims/fillOriginalPDF.ts` — corregir asignación de PRE (prefijo), y dividir email en `undefined_2` + `undefined_3`


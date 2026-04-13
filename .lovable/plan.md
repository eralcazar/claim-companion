

## Plan: Corregir checkboxes de tipo de póliza en PDF MetLife

**Problema:** Los checkboxes de "Colectiva" e "Individual" en la Sección 1 del PDF MetLife no se marcan, probablemente porque los IDs de campo ("COLEC" / "INDI") no coinciden con los nombres reales en el PDF.

**Causa probable:** Los nombres de campo del PDF para esos checkboxes son diferentes a los que usamos en el código.

### Pasos

1. **Inspeccionar el PDF MetLife** con `pypdf` para obtener los nombres exactos de los campos checkbox en la Sección 1 ("Datos de quien contrató la póliza" / "Datos del tipo de póliza").

2. **Actualizar `fillMetLifeFields`** en `src/components/claims/fillOriginalPDF.ts` con los IDs correctos para los checkboxes de Colectiva e Individual.

3. **Generar un PDF de prueba** y verificar visualmente que el checkbox correcto se marque según el tipo de póliza registrado.

### Archivo a modificar
- `src/components/claims/fillOriginalPDF.ts` — actualizar los IDs de `checkBox(pdfForm, "COLEC", ...)` y `checkBox(pdfForm, "INDI", ...)` con los nombres reales del PDF.


---
name: MetLife and MAPFRE form filling
description: Original PDF form filling for 4 insurance templates using pdf-lib, plus jsPDF summary generation
type: feature
---
## PDF Form Filling
- 4 original PDF templates stored in `public/forms/`: METLIFE_REEMBOLSO, METLIFE_PROGRAMACION_DE_SERVICIOS, MAPFRE_REEMBOLSO, MAPFRE_PROGRAMACION_DE_SERVICIOS
- All 4 have fillable form fields (not scanned images)
- `src/components/claims/fillOriginalPDF.ts` uses `pdf-lib` to fill and flatten the original PDFs
- `src/components/claims/generateClaimPDF.ts` uses `jspdf` to generate a summary PDF from scratch
- Both options available on the review step: "Formato Oficial" (original form) and "Resumen" (generated)

## MetLife checkbox values: `/Yes` checked, `/Off` unchecked
## MAPFRE reembolso checkbox values: `/On` checked, `/Off` unchecked  
## MAPFRE programación checkbox values: `/Sí` checked, `/Off` unchecked

## Key field IDs per template
### MetLife (both forms share same fields pages 1-3)
- Patient: Apellido paterno, Apellido materno, Nombres, RFC, Póliza
- DOB: DIAASEG/MESASEG/AASEG
- Cause: ACC/ENF/ENFo checkboxes
- Type: REMBOLSO/PROGRAMACION checkboxes
- Invoices: Número Factura ReciboRow1-6, ConceptoRow1-6, ImporteRow1-6
- Payment: transferencia/cheque checkboxes, CLABE, bank name

### MAPFRE Reembolso
- Patient: Nombre del paciente, RFC, CURP_, Masculino/Femenino
- Invoices: Nombre del proveedor1-15, fill_19-33 (amounts)
- Payment: Transferencia electrónica/Cheque, Banco, Clabe interbancaria

### MAPFRE Programación
- Checkboxes use `/Sí` value
- Surgery: Nombre médico, N° cédula, Especialidad, Hospital, Procedimiento quirúrgico...
- Cause: A/En/E checkboxes

---
name: MetLife and MAPFRE form filling
description: Original PDF form filling for 4 insurance templates using pdf-lib, plus jsPDF summary generation. MetLife reembolso has full 10-section structure.
type: feature
---
## PDF Form Filling
- 4 original PDF templates stored in `public/forms/`: METLIFE_REEMBOLSO, METLIFE_PROGRAMACION_DE_SERVICIOS, MAPFRE_REEMBOLSO, MAPFRE_PROGRAMACION_DE_SERVICIOS
- All 4 have fillable form fields (not scanned images)
- `src/components/claims/fillOriginalPDF.ts` uses `pdf-lib` to fill and flatten the original PDFs
- `src/components/claims/generateClaimPDF.ts` uses `jspdf` to generate a summary PDF from scratch
- Both options available on the review step: "Formato Oficial" (original form) and "Resumen" (generated)

## MetLife Reembolso — 10 sections mapped
1. Datos del contratante (date, policy type)
2. Asegurado titular (name, RFC, DOB, policy number)
3. Asegurado afectado (separate patient if not titular — name, DOB, relationship, certificate)
4. Contacto del titular (address, phone, email)
5. Datos complementarios (other policies, prior insurance, prior MetLife claims, PEP, DCN folio)
6. Información de la reclamación (type, cause, dates, diagnosis, treatment, authority knowledge)
7. Facturas (invoices, lab studies)
8-9. Pago (transfer/check, bank, CLABE)

## Wizard Steps (MetLife)
StepClaimType → StepPolicySelect → StepPatientInfo → StepMedicalInfo → StepComplementaryInfo → StepHospitalInfo → StepInvoices/StepPayment or StepSurgeryInfo → StepReview

## MetLife checkbox values: `/Yes` checked, `/Off` unchecked
## MAPFRE reembolso checkbox values: `/On` checked, `/Off` unchecked  
## MAPFRE programación checkbox values: `/Sí` checked, `/Off` unchecked

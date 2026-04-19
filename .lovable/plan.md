
El usuario reporta que el PDF generado no usa el formato original de la aseguradora. Necesito investigar por qué el flujo está cayendo al fallback jsPDF en lugar de usar `generateFilledPDF` con el PDF de Storage.

Voy a inspeccionar el flujo actual de `handleGenerate` en NewClaim, el `getFormKey` en registry, y los `storagePath` en formCoordinates para detectar la desconexión.



## Objetivo

Generar un PDF imprimible de la **solicitud de estudios médicos** (orden médica), usando el mismo patrón que el PDF de recetas, accesible desde un botón "Imprimir / PDF" en la tarjeta del estudio.

## Cambios

### 1. Nuevo helper: `src/components/estudios/estudioPdf.ts`

Función `generateEstudioPDF({ estudio, patient, doctor })` que produce un PDF A4 con `jsPDF` + `jspdf-autotable`:

- **Encabezado**: título "Solicitud de Estudios Médicos" centrado, fecha de emisión a la derecha, folio (`estudio.id` cortado a 8 chars).
- **Bloque Médico**: nombre, especialidad, cédula, dirección, teléfono.
- **Bloque Paciente**: nombre, edad (calculada desde `date_of_birth` del profile), email, teléfono.
- **Tabla principal de estudios solicitados** (`autoTable`, theme striped, headStyles azul `[59, 130, 246]`):
  - Columnas: `#`, `Tipo de estudio`, `Cantidad`, `Prioridad`.
  - Una fila con los datos de `estudio` (capitalizado, `_` → espacios).
- **Sección "Indicaciones del médico"**: muestra `estudio.indicacion` si existe, con `splitTextToSize`.
- **Sección "Preparación / Ayuno"** (sólo si aplica):
  - Si `ayuno_obligatorio` → línea destacada "⚠ AYUNO OBLIGATORIO de X horas".
  - Si `preparacion` → texto envuelto.
- **Sección "Laboratorio sugerido"**: si `laboratorio_sugerido` existe.
- **Sección "Observaciones"**: si `observaciones` existe.
- **Pie con firma**: línea horizontal centrada cerca del final + nombre del médico + cédula.
- **Footer mínimo en cada página**: "Generado por MediClaim · {fecha}" + número de página, igual que `generateFormPDF.ts`.

Filename: `solicitud_estudio_{tipo}_{YYYY-MM-DD}.pdf`.

### 2. Modificar `EstudioCard.tsx`

- Importar `generateEstudioPDF` y `supabase`.
- Añadir función `downloadPdf` análoga a la de `RecetaCard`:
  - Carga `profiles` del paciente y del médico, y `medicos` del médico (cédula, dirección, teléfono).
  - Calcula `nameOf` y arma los argumentos.
  - Llama `generateEstudioPDF`.
  - Toast de error si falla.
- Añadir botón **"PDF"** con ícono `Download` en la barra de acciones (`flex flex-wrap`), antes del botón "Resultados". Visible para todos los roles que pueden ver la tarjeta (paciente, médico, admin, broker), porque el paciente también necesita imprimirlo para llevar al laboratorio.
- Disabled mientras se descargan los datos (estado local `loading`).

### 3. Detalles UX

- El botón aparece siempre (no requiere `canEdit`), porque el paciente debe poder imprimir su propia orden.
- Si `estudio.estado === "cancelado"`, el PDF incluye una marca de agua diagonal "CANCELADO" en gris claro (`doc.setTextColor(200,200,200)` + `setFontSize(60)` + ángulo 45°) para evitar uso indebido.
- En móvil (viewport ~984px o menor) el botón se acomoda en el `flex-wrap` ya existente.
- No requiere cambios de base de datos ni de RLS: lee tablas a las que el usuario ya tiene acceso (`profiles`, `medicos`).

## Archivos

**Creados:**
- `src/components/estudios/estudioPdf.ts`

**Modificados:**
- `src/components/estudios/EstudioCard.tsx` — agregar botón PDF + función `downloadPdf`.

## Resultado esperado

Usuario abre `/estudios` → en cada tarjeta aparece un botón **"PDF"** junto a "Resultados" → click descarga `solicitud_estudio_quimica_sanguinea_2026-04-22.pdf` con encabezado profesional, datos del médico y paciente, tabla con el estudio solicitado, indicaciones, preparación/ayuno destacado, laboratorio sugerido, observaciones y firma del médico al pie. Si el estudio está cancelado, aparece una marca de agua "CANCELADO".


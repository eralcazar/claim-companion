

## Objetivo

Construir el **pipeline completo** de un reclamo: desde elegir póliza+formato hasta tener el PDF oficial llenado, guardado en Storage y descargable, con folio único en BD. Hoy las piezas existen pero no están conectadas extremo a extremo de forma confiable.

## Estado actual del pipeline

```text
[1] /reclamos/nuevo
     │ Selecciona póliza → filtra formatos reales del bucket  ✅ HECHO
     │ Selecciona formato (informe_medico, reembolso, etc.)   ✅ HECHO
     ▼
[2] Wizard multi-paso (FormRenderer + definitions A..H)       ✅ HECHO
     │ Autofill desde profile/policy                          ✅ HECHO
     │ Autosave a tabla claim_forms (draft)                   ✅ HECHO
     ▼
[3] Generación PDF
     │ buildOverlayData() → fillPDF() con coordenadas         ⚠️ COORDENADAS PLACEHOLDER
     │ Sube a bucket "documents"                              ✅ HECHO
     │ Genera folio (RPC gen_folio)                           ✅ HECHO
     │ Marca claim_forms.status = "submitted"                 ✅ HECHO
     ▼
[4] /reclamos (lista)
     │ Tab "Enviados" descarga PDF de Storage                 ✅ HECHO
     │ Tab "Borradores" continúa el wizard                    ✅ HECHO
     ▼
[5] /formatos
     │ Descarga PDF en blanco por aseguradora                 ✅ HECHO
```

**Lo que falta para "pipeline completo y confiable":**
1. Coordenadas reales para los 23 PDFs (hoy varios son placeholders).
2. Manejo de errores robusto en cada paso (Storage caído, RPC falla, validación falla a mitad).
3. Visibilidad: el usuario no ve en qué paso del pipeline está su trámite.
4. Reintento de generación PDF sin re-llenar el wizard.
5. Validación de que el archivo PDF original existe en Storage **antes** de empezar a llenar.

## Solución propuesta

### Fase A — Robustez del pipeline existente (sin tocar coordenadas)

**A1. Pre-check de archivo en Storage al elegir formato**
- En `NewClaim.tsx`, cuando el usuario elige formato, hacer un `HEAD` al `publicUrl` de `formatos/<INSURER>/<file>`.
- Si 404 → toast error "Este formato aún no está disponible" y bloquear el wizard.
- Evita que el usuario llene 10 pasos para descubrir al final que el PDF no existe.

**A2. Estado del trámite visible en `/reclamos`**
- Añadir badge a cada `claim_form`:
  - `draft` → "Borrador"
  - `submitted` → "PDF generado"
  - `error` (nuevo) → "Error al generar — Reintentar"
- Botón "Regenerar PDF" en submitted → vuelve a llamar `generateFilledPDF` con la `data` ya guardada, sin pasar por el wizard.

**A3. Manejo de errores en `handleGenerate` (NewClaim.tsx)**
- Hoy si falla el upload o el RPC, el draft queda en limbo. Capturar errores y:
  - Marcar `claim_forms.status = "error"` con `error_message` (nueva columna).
  - Toast claro con la causa.
  - No navegar fuera, permitir reintentar.

**A4. Migración BD**
```sql
ALTER TABLE public.claim_forms
  ADD COLUMN IF NOT EXISTS error_message text;
-- status ya es text libre, acepta 'error' sin cambios
```

### Fase B — Helper centralizado de pipeline

Crear `src/lib/claimPipeline.ts` con una sola función:

```ts
export async function runClaimPipeline(input: {
  userId: string;
  insurer: string;
  formatId: string;
  policyId: string;
  data: Record<string, any>;
  profile: any;
  policy: any;
  existingDraftId?: string;
}): Promise<{ folio: string; pdfPath: string; publicUrl: string }>
```

Encapsula los 5 pasos: validar storage → buildOverlay → generateFilledPDF → upload → gen_folio → update claim_forms. Devuelve la URL pública. Centraliza el manejo de errores y el marcado de status.

`NewClaim.tsx` y el botón "Regenerar PDF" en `/reclamos` lo invocan igual.

### Fase C — Diagnóstico visual (opcional, muy útil)

Página `/admin/pipeline-status` (solo admin) que muestre:
- Tabla con los 23 formatos (insurer × formato).
- Por cada uno: ¿archivo existe en Storage? ¿hay coordenadas? ¿hay definición A..H?
- Un solo vistazo para saber qué del pipeline está roto.

## Archivos a tocar

```text
crea:  src/lib/claimPipeline.ts                  (helper unificado)
edita: src/pages/NewClaim.tsx                    (usa pipeline + pre-check storage)
edita: src/pages/Claims.tsx                      (badge estado + botón regenerar)
edita: src/components/claims/forms/registry.ts   (exporta helper checkFormatExists)
crea:  src/pages/admin/PipelineStatus.tsx        (Fase C — solo si confirmas)
edita: src/App.tsx                               (ruta /admin/pipeline-status)
migración SQL: añadir error_message a claim_forms
```

## Lo que NO incluye este plan

- **Calibración de coordenadas** de los 23 PDFs (es un trabajo manual aparte, formato por formato).
- Cambios en el bucket de Storage o en los archivos PDF.
- Cambios en las definiciones de formularios A..H.

## Decisión que necesito antes de implementar

Confirma alcance:
- **Mínimo:** Fase A (robustez) — ~30 min.
- **Recomendado:** Fase A + B (pipeline unificado y reintento) — ~1 h.
- **Completo:** Fase A + B + C (con dashboard admin) — ~1.5 h.

¿Cuál ejecuto?


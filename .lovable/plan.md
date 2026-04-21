

## Objetivo

Fase 2: lector IA de PDFs de resultados. Cuando el médico/admin sube un PDF (o imagen) de resultado de estudio, una edge function envía el archivo a Lovable AI (Gemini 2.5 Pro) y extrae automáticamente los indicadores (nombre, valor, unidad, rango de referencia) que se insertan en `indicadores_estudio` con flag `es_normal`/`flagged`.

## 1. Edge function nueva: `extract-study-indicators`

Archivo: `supabase/functions/extract-study-indicators/index.ts`

- Input: `{ resultado_id: string }`.
- Flujo:
  1. Cliente Supabase con service role + JWT del caller para autorización.
  2. Carga el `resultado_estudios` por id; obtiene `pdf_path`, `patient_id`, `estudio_id`.
  3. Verifica permisos: el caller debe ser admin, médico asignado al estudio, broker asignado al paciente, o el propio paciente. (El paciente puede ver pero no extraer; restringimos a admin/medico/broker).
  4. Descarga el archivo desde el bucket privado `estudios-resultados` (signed URL interno o `download()`).
  5. Si es PDF → enviarlo como `image_url` data-URI con `data:application/pdf;base64,...` (Gemini 2.5 Pro acepta PDFs vía data URL). Si es imagen → enviarla directamente.
  6. Llama a `https://ai.gateway.lovable.dev/v1/chat/completions` con `model: "google/gemini-2.5-pro"`, system prompt en español especializado en resultados de laboratorio/imágenes médicas, y **tool calling** con función `extraer_indicadores` (parámetros: `indicadores[] { nombre_indicador, codigo_indicador?, valor (number|null), unidad?, valor_referencia_min?, valor_referencia_max?, observacion? }`, más opcionales `fecha_resultado`, `laboratorio_nombre`).
  7. Maneja 429 / 402 / 5xx con mensajes claros (igual que `detect-form-fields`).
  8. Calcula `es_normal` y `flagged` server-side a partir de valor/min/max.
  9. **Inserta** los indicadores en `indicadores_estudio` (lote `insert(...)`). Si `fecha_resultado` o `laboratorio_nombre` vinieron en la respuesta y el `resultados_estudios` no los tiene, los actualiza también.
  10. Devuelve `{ inserted: number, indicadores: [...], meta: { fecha_resultado, laboratorio_nombre } }`.

Notas:
- `verify_jwt = true` (default). Usa el header `Authorization` para validar quién llama y para reusar RLS.
- CORS estándar Lovable.
- Límite: si el PDF supera ~6 MB en base64 → devolver 413 con mensaje "Archivo demasiado grande, reduce o convierte a imagen".

## 2. Hook nuevo: `useExtractIndicators`

Archivo: `src/hooks/useResultadosEstudio.ts` (agregar export).

- `useMutation` que llama `supabase.functions.invoke("extract-study-indicators", { body: { resultado_id } })`.
- En `onSuccess`: invalida `["indicadores"]` y `["resultados"]`, muestra toast con `"${n} indicadores extraídos"`.
- Maneja errores 402/429 con toast amigable.

## 3. UI: `ResultadosManager.tsx`

- En cada `ResultadoItem`, junto a "Ver indicadores", agregar botón **"✨ Extraer con IA"** (visible si `canManage`).
  - Si `indicadores.length > 0`: el botón dice "Re-extraer" y al hacer click pide confirmación (`¿Reemplazar los indicadores existentes?`). Si confirma, primero borra los actuales (vía `deleteMany`) y luego dispara la extracción.
  - Estado loading: el botón muestra spinner y texto "Analizando PDF…".
- Tras subir un nuevo resultado (`useUploadResultado.onSuccess`), preguntar opcionalmente con un toast con acción "Extraer indicadores ahora" que dispare la extracción para el resultado recién creado. (Toast con `action`).

## 4. Cambios menores

- `src/hooks/useResultadosEstudio.ts`: pequeño helper `useDeleteIndicadoresByResultado(resultadoId)` para limpiar antes de re-extraer.
- Actualizar `useUploadResultado` para devolver el id del resultado creado (ya lo hace) y exponerlo al consumidor.

## 5. Archivos a tocar

**Creados:**
- `supabase/functions/extract-study-indicators/index.ts`

**Modificados:**
- `src/hooks/useResultadosEstudio.ts` — nuevo hook `useExtractIndicators` + helper de borrado masivo.
- `src/components/estudios/ResultadosManager.tsx` — botón "Extraer con IA", confirmación de re-extracción, toast post-upload con acción.

**Sin cambios:** la tabla `indicadores_estudio` ya existe con todos los campos necesarios; el bucket `estudios-resultados` ya existe y es privado; `LOVABLE_API_KEY` ya está configurada.

## 6. Detalles técnicos clave

- **System prompt** (resumen): "Eres analista de resultados clínicos. Extrae cada indicador medido con su valor numérico, unidad y rango de referencia. Si el rango aparece como '70-110', devuelve min=70 y max=110. Ignora encabezados, firmas y comentarios. No inventes valores. Si el campo es cualitativo (ej: Negativo/Positivo) registra `valor=null` y pon el resultado en `observacion`."
- **Tool schema** garantiza JSON estructurado válido.
- **PDF a Gemini**: usar `data:application/pdf;base64,<...>` en `image_url.url` (Gemini 2.5 Pro lo soporta). Para imágenes JPG/PNG igual.
- **Cálculo es_normal**: `valor != null && min != null && max != null ? valor >= min && valor <= max : null`. `flagged = es_normal === false`.
- **Idempotencia**: la primera extracción inserta; las siguientes requieren confirmación + borrado previo, para evitar duplicados.

## Resultado esperado

Médico abre un estudio → sube PDF de resultado → ve toast "Resultado subido. ¿Extraer indicadores con IA?" → click → spinner ~5-15s → tabla de indicadores se llena automáticamente con valores, unidades, rangos y flags de "Fuera de rango"/"Normal". Puede editarlos manualmente o re-extraer si algo salió mal. El paciente los ve en modo lectura.


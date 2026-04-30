## Objetivo

Permitir al admin elegir el modelo de IA usado para OCR (extracción de indicadores de estudios y detección de campos de formularios), tal como se hace hoy con el modelo de Kari. El modelo se lee dinámicamente desde la tabla `ai_settings`.

## Cambios

### 1. Nueva configuración global

Reutilizamos la tabla existente `ai_settings` (key/value JSON, RLS admin-only ya configurada).
- Nuevo `key = 'ocr_active_model'`, value default `"google/gemini-2.5-pro"`.

Se hace via `supabase--insert` (es solo un upsert de configuración, no schema).

### 2. Edge functions: leer modelo dinámicamente

Modificar:
- `supabase/functions/extract-study-indicators/index.ts`
- `supabase/functions/detect-form-fields/index.ts`

En cada una:
- Antes de llamar al gateway, leer con service role:
  ```ts
  const { data } = await admin.from("ai_settings").select("value").eq("key", "ocr_active_model").maybeSingle();
  const model = (typeof data?.value === "string" ? data.value : "google/gemini-2.5-pro");
  ```
- Reemplazar el literal `model: "google/gemini-2.5-pro"` por `model`.
- Loggear el modelo + tokens usados (si la respuesta los trae) para auditoría.

### 3. Hook frontend

En `src/hooks/useAiTokenPacks.ts` agregar:
- `useOcrActiveModel()` y `useSetOcrActiveModel()` análogos a los de Kari.
- Constante `OCR_MODEL_OPTIONS` con los 4 modelos relevantes y su costo µUSD/token + nota de calidad:
  - `google/gemini-2.5-flash-lite` — Más económico, solo formularios simples
  - `google/gemini-2.5-flash` — Balanceado, recomendado para la mayoría
  - `google/gemini-3-flash-preview` — Última generación, calidad/costo
  - `google/gemini-2.5-pro` — Premium, máxima precisión (actual)

### 4. UI de selector

En `src/pages/admin/KariUsageAdmin.tsx`, agregar una segunda card **"Modelo de IA para OCR"** debajo de la de Kari, con:
- Selector de modelo (mismo patrón que Kari).
- Badge mostrando costo µUSD por 1k tokens input/output.
- Estimación de costo por escaneo típico (~3k input + 2k output).
- Nota explicando: este modelo se usa para `extract-study-indicators` y `detect-form-fields`.

## Detalles técnicos

- Sin cambios de schema — usamos `ai_settings` existente.
- Las edge functions usan service role para leer `ai_settings` (la RLS public read ya es `true` para authenticated, pero las edge functions corren sin sesión; service role bypasa RLS).
- Fallback al modelo Pro actual si la config no existe, para no romper nada.
- Despliegue automático de las dos edge functions modificadas.

## Resultado esperado

En `/admin/kari-uso` aparece una nueva card "Modelo de IA para OCR". El admin puede cambiar entre Pro/Flash/Flash-Lite según el balance precisión vs costo deseado, y el cambio se aplica al instante a todos los OCR posteriores. Costo estimado por escaneo se muestra junto al selector.
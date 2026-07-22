## Objetivo

Agregar un botón **"Sincronizar modelos"** por proveedor BYOK en `/admin/api-keys` que consulte en vivo el catálogo del proveedor y actualice `ai_external_providers.models` para que el selector del panel de políticas siempre muestre los modelos vigentes.

## Cambios

### 1. Nueva edge function `sync-ai-provider-models`
Ruta: `supabase/functions/sync-ai-provider-models/index.ts`.

- Body: `{ provider: "gemini" | "mistral" | "claude" }`.
- Autenticación: valida JWT y exige `has_role(admin)` con `service_role`. Rechaza sin admin (403).
- Lee la API key desde `Deno.env.get()` según el proveedor (`GEMINI_API_KEY` / `MISTRAL_API_KEY` / `ANTHROPIC_API_KEY`). Si falta → 400 con mensaje claro.
- Llama al catálogo nativo del proveedor:
  - **Gemini**: `GET https://generativelanguage.googleapis.com/v1beta/models?key=…` y filtra los que soporten `generateContent` y cuyo nombre empiece con `models/gemini-`.
  - **Mistral**: `GET https://api.mistral.ai/v1/models` con `Authorization: Bearer`.
  - **Claude**: `GET https://api.anthropic.com/v1/models` con headers `x-api-key` y `anthropic-version: 2023-06-01`.
- Normaliza a `[{ id, label }]` (label = display_name/id limpio, prefijado por familia).
- Preserva `default_model` si sigue existiendo; si no, usa el primero.
- `UPDATE public.ai_external_providers SET models = $1, default_model = $2, updated_at = now() WHERE id = $provider` con service role.
- Inserta en `ai_api_key_audit` una fila con `action = 'models_synced'`, `secret_name`, `latency_ms`, `note = 'N modelos'`, actor.
- Responde `{ ok, count, models, default_model }` o `{ ok:false, status, error_message }`.

### 2. UI `src/pages/admin/ApiKeysMaintenance.tsx`
- Nuevo botón **"Sincronizar modelos"** (icono `ListTree` o `RefreshCw`) al lado de "Probar ahora" en cada tarjeta.
- Deshabilitado si `!s.configured`; con `Loader2` mientras corre.
- Llama `supabase.functions.invoke("sync-ai-provider-models", { body: { provider: meta.provider } })`.
- Toast con el conteo de modelos (o el error del proveedor).
- Refresca `load()` + `loadHistory()` al terminar para mostrar la entrada `models_synced` en el historial.
- Extiende la leyenda del historial para reconocer `models_synced` con badge neutra.

### 3. No se toca
- `ai-router.ts`, `useAiPolicies.ts` y `AiPolicyPanel.tsx` no cambian: ya leen `models` desde `ai_external_providers` con `useExternalProviders`, así que se refresca solo al reabrir el panel de políticas.
- ApiFreeLLM no expone catálogo → se omite del botón (solo aparece para las tres tarjetas BYOK ya listadas en `PROVIDER_META`).

## Verificación

- `tsgo` para tipos.
- Desplegar `sync-ai-provider-models` y probar desde `/admin/api-keys` → verificar toast con conteo, fila `models_synced` en historial, y que el selector de modelo en `/admin/ai-policies` refleje la lista nueva al seleccionar el proveedor.
- Probar caso de key ausente y respuesta 401 del proveedor: debe devolver error legible sin romper la UI.
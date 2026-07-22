## Objetivo

Añadir un botón **"Sincronizar modelos"** en `Admin → Políticas de IA` (`AiPolicyPanel`) que refresque el catálogo del proveedor seleccionado en la fila y actualice el selector de modelos sin recargar la página.

## Alcance

- Fila `PolicyRow` de `src/components/admin/AiPolicyPanel.tsx`: añadir botón al lado del selector de proveedor.
- Solo visible cuando el proveedor NO es `lovable` (el catálogo interno no se sincroniza).
- Reutiliza la edge function existente `sync-ai-provider-models` (ya usada por `/admin/api-keys`).

## Comportamiento

1. Al hacer clic:
   - Llama `supabase.functions.invoke("sync-ai-provider-models", { body: { provider: draft.provider } })`.
   - Muestra spinner en el botón durante la llamada.
2. Al terminar OK:
   - Invalida las queries `["ai_external_providers"]` y `["ai_policies"]` para que `useExternalProviders` re-lea el registro con `models` actualizado.
   - Toast `sonner`: "N modelos sincronizados desde {provider}".
   - Si el modelo actual ya no está en el nuevo catálogo, resetea `draft.model` al `defaultModelForProvider(...)` (o `"standard"` si no hay).
3. Si falla:
   - Toast destructivo con el mensaje del error (usa `FunctionsHttpError.context.text()` como en `/admin/api-keys`).
4. Estado deshabilitado si `draft.provider === "lovable"`.

## Cambios de archivos

- `src/components/admin/AiPolicyPanel.tsx`
  - Import: `useQueryClient` de `@tanstack/react-query`, `supabase` de `@/integrations/supabase/client`, `FunctionsHttpError` de `@supabase/supabase-js`, `toast` de `sonner`, `RefreshCw` de `lucide-react`.
  - Nuevo estado local `syncing: boolean` por fila.
  - Handler `handleSync()` con el flujo anterior.
  - JSX: botón `variant="outline" size="sm"` bajo o al lado del `Select` de proveedor, con tooltip explicativo.

## Fuera de alcance

- No modificar la edge function `sync-ai-provider-models`.
- No tocar `/admin/api-keys` (ya tiene su propio botón).
- No añadir sincronización automática ni cron.

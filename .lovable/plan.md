## Objetivo

Antes de sincronizar el catálogo de modelos, ejecutar automáticamente un **preflight de "Probar conexión"** al proveedor. Si el preflight falla, mostrar la **causa probable** (reutilizando `diagnoseTestError`) y **no lanzar la sincronización**. El usuario puede reintentar la prueba desde el mismo aviso.

Aplica en el botón **"Sincronizar modelos"** de `/admin/api-keys` y en el botón **"Sincronizar modelos ahora"** que aparece dentro del aviso de catálogo vacío.

## Cambios

Archivo: `src/pages/admin/ApiKeysMaintenance.tsx`.

1. Refactorizar `runSync(secretName)` para que:
   - Llame primero a `supabase.functions.invoke("test-ai-provider", { body: { provider: meta.provider } })`.
   - Si `!error && data?.ok` → continúa con `sync-ai-provider-models`; toast de éxito incluye `"(conexión OK · <latency_ms> ms)"`.
   - Si falla → genera `TestDiag` con `diagnoseTestError` y:
     - Guarda el diagnóstico en `diag[secretName]` (mismo estado que ya usa "Probar ahora").
     - Muestra toast destructivo con `Sincronización cancelada: <cause>`.
     - No llama a `sync-ai-provider-models`.
     - Refresca `load()` + `loadHistory()` para reflejar el intento auditado.
2. Añadir bandera visual mientras el preflight corre (`syncing[name]` ya se pone antes; conservar comportamiento y limpiar al final tanto si aborta como si continúa).
3. Ajustar copy del `title` del botón "Sincronizar modelos" a: *"Verifica conexión y actualiza el catálogo del proveedor"*.
4. En el bloque del panel de diagnóstico existente (donde ya se muestra `diag[s.name]` para fallos de "Probar ahora"), añadir un botón secundario **"Reintentar sincronización"** que dispara `runSync(s.name)` de nuevo (mismo flujo con preflight).

## Sin cambios de backend

- No se toca `sync-ai-provider-models` ni `test-ai-provider`. El preflight reutiliza la función existente y su registro en `ai_api_key_audit`.
- No hay migración.

## Fuera de alcance

- No se agrega un botón separado "Probar conexión antes de sincronizar" (el preflight es transparente).
- No se cambia el flujo de `runTest` (Probar ahora) — sigue siendo manual e independiente.

## Archivo

- `src/pages/admin/ApiKeysMaintenance.tsx` — `runSync`, panel de diagnóstico y microcopy del botón.

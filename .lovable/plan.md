# Plan: mantenimiento avanzado de API keys BYOK + fix selector de modelos

## Bug confirmado

En `src/components/admin/AiPolicyPanel.tsx` (línea 79) el dropdown "Modelo" siempre renderiza `AI_MODEL_CHOICES` completo — no filtra por el proveedor seleccionado. Por eso al cambiar a `claude` sigues viendo los modelos de Gemini y de todos los demás.

## Cambios

### 1. Selector de modelo filtrado por proveedor (fix del bug)
- En `useAiPolicies.ts`, etiquetar cada entrada de `AI_MODEL_CHOICES` con su `provider` (`lovable | gemini | mistral | claude`) o exponer `AI_MODELS_BY_PROVIDER`.
- En `AiPolicyPanel.tsx` filtrar la lista según `draft.provider`; al cambiar proveedor, resetear `draft.model` al primer modelo válido de ese proveedor (o al `default_model` que ya trae `ai_external_providers`).
- Mostrar leyenda vacía "Sin modelos configurados — agrégalos en /admin/ai-providers" si el proveedor externo no tiene modelos en `ai_external_providers.models`.

### 2. Historial auditado de cambios de API keys
- Nueva tabla `ai_api_key_audit` (admin-only, RLS estricta): `id`, `secret_name`, `action` (`configured|rotated|verified|test_success|test_failed`), `actor_user_id`, `actor_email`, `preview_before`, `preview_after`, `note`, `created_at`.
- Grants: `SELECT` a `authenticated` con policy `has_role(auth.uid(),'admin')`; `INSERT/ALL` solo a `service_role`.
- Todas las inserciones desde edge functions (nunca desde cliente).

### 3. Última rotación / verificación por proveedor
- Extender `check-ai-secrets` para devolver, además del estado, el `last_action_at` y `last_action` leyendo el máximo `created_at` por `secret_name` de `ai_api_key_audit`.
- En `/admin/api-keys` mostrar chip "Actualizada hace X" y "Último test: OK/ERROR hace Y".

### 4. Test en vivo por proveedor
- Nueva edge function `test-ai-provider` (admin-only, verifica `has_role`).
  - Input: `{ provider: 'gemini'|'mistral'|'claude' }`.
  - Ejecuta una llamada mínima (`"ping"`, max_tokens=5) al endpoint OpenAI-compatible del proveedor usando el secret correspondiente (`GEMINI_API_KEY` / `MISTRAL_API_KEY` / `ANTHROPIC_API_KEY`) con el `default_model` de `ai_external_providers`.
  - Devuelve `{ ok, latency_ms, model_used, error_message? }` y registra el resultado en `ai_api_key_audit` (`test_success` o `test_failed`).
- En `/admin/api-keys`: botón "Probar ahora" por tarjeta, spinner, badge de resultado con latencia y mensaje de error si aplica.

### 5. Mejorar botón "Copiar instrucción"
- El prompt copiado debe incluir:
  - Nombre exacto del secret (`GEMINI_API_KEY` etc.).
  - Formato esperado (prefijos: `sk-ant-` para Claude, longitud aproximada para Gemini/Mistral).
  - URL oficial donde obtenerla.
  - Recordatorio: "después de guardar, vuelve a /admin/api-keys y pulsa Probar ahora".
- Tras copiar, mostrar un banner persistente "Esperando confirmación de rotación" con botón **Verificar ahora** que dispara el test en vivo y, si pasa, registra `rotated` en el audit.

### 6. Políticas de IA por feature (afinado)
- En el mismo panel de políticas, tras el fix del selector, agregar validador que impida guardar si:
  - `provider` es externo y el proveedor está `activo=false` en `ai_external_providers`.
  - El `model` no pertenece al `provider` seleccionado.
- Mostrar el `default_model` del proveedor como sugerencia visual.

## Detalles técnicos

**Archivos nuevos**
- `supabase/functions/test-ai-provider/index.ts`
- Migración: `ai_api_key_audit` + índice por `(secret_name, created_at desc)`.

**Archivos a modificar**
- `src/hooks/useAiPolicies.ts` — añadir `provider` a cada modelo o exponer `AI_MODELS_BY_PROVIDER`.
- `src/components/admin/AiPolicyPanel.tsx` — filtrar modelos, reset al cambiar proveedor, validación al guardar.
- `src/pages/admin/ApiKeysMaintenance.tsx` — badges de última acción, botón Probar ahora, tabla de historial (últimas 20 entradas por secret con paginación simple).
- `supabase/functions/check-ai-secrets/index.ts` — join con `ai_api_key_audit` para `last_action`.
- `supabase/functions/_shared/ai-router.ts` — ya expone `callByokProvider`, se reutiliza en `test-ai-provider` con `max_tokens=5`.

**Modelos usados en el test**
Se usará el `default_model` guardado en `ai_external_providers` para cada proveedor; si no hay uno, el primero de `models[]`. Body mínimo estilo OpenAI: `{ model, messages: [{role:'user',content:'ping'}], max_tokens: 5 }`.

**Seguridad**
- Todas las funciones nuevas validan `has_role(auth.uid(),'admin')`.
- El audit no guarda valores de keys, solo `preview` (`xxxx…yyyy`), longitud y metadatos.
- La tabla de audit nunca es escrita desde el cliente.

## Fuera de alcance
- Rotación automatizada de secrets (sigue requiriendo el formulario seguro de Lovable).
- Alertas por email cuando una key falla (queda para siguiente iteración).

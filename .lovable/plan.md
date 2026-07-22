## Problema

Al elegir el proveedor **ApiFreeLLM** en `/admin/ai-policies`, el selector de modelo aparece vacío. Verificado en el código:

- `src/hooks/useAiPolicies.ts` (`modelsForProvider`) devuelve `[]` cuando el proveedor externo tiene `models = []`.
- La migración `20260722022937_...sql` sembró `gemini`, `mistral` y `claude` con listas de modelos, pero para `apifreellm` solo hizo un `UPDATE` de `default_model = 'gpt-3.5-turbo'` **sin poblar `models`**.

Resultado: la fila `ai_external_providers.id = 'apifreellm'` tiene `models = '[]'::jsonb` → dropdown vacío.

ApiFreeLLM no expone catálogo de modelos ni permite elegir uno realmente (el servicio decide internamente), así que la solución correcta es exponer un modelo "Estándar" fijo.

## Cambios

### 1. Migración SQL
Actualizar la fila `apifreellm` en `ai_external_providers`:

- `models = [{ "id": "standard", "label": "Estándar (auto)" }]`
- `default_model = 'standard'`

### 2. Router edge (`supabase/functions/_shared/ai-router.ts`)
En `callApiFreeLLM`, si `model === 'standard'` no enviar el campo `model` en el body (o enviar el valor que ApiFreeLLM acepte por defecto). El resto del flujo queda igual.

### 3. UI (`src/components/admin/AiPolicyPanel.tsx`)
Ya llama a `defaultModelForProvider` al cambiar de proveedor, así que al seleccionar ApiFreeLLM se autoseleccionará `standard` y el dropdown mostrará "Estándar (auto)". No requiere cambios adicionales.

### 4. Verificación
- `tsgo` para chequeo de tipos.
- Abrir `/admin/ai-policies`, elegir proveedor ApiFreeLLM y confirmar que el selector muestra "Estándar (auto)" y se guarda la política.

## Fuera de alcance

- No se agregan más proveedores.
- No se cambia el catálogo `AI_MODEL_CHOICES` de Lovable.
- No se tocan Gemini/Mistral/Claude.
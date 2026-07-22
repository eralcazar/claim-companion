
# Plan: activar ApiFreeLLM sólo donde es seguro

## Objetivo
Habilitar ApiFreeLLM en **exactamente dos features** con controles duros: un nuevo endpoint de glosario educativo (uso natural sin PII), y el coach de actividad rediseñado (sin condiciones médicas específicas). Todo lo demás sigue en Lovable AI. El usuario controla ambas desde "Mis datos y IA".

---

## Alcance

### 1. Nueva edge function `ai-glossary`
Propósito: responder preguntas educativas genéricas ("¿qué es la hipertensión?", "¿para qué sirve el metoprolol?") sin tocar datos del paciente.

Flujo:
1. Auth requerida, valida sesión.
2. Carga política `glossary` desde `ai_provider_policy`.
3. **Gate estricto**: rechaza con 400 (`code: "not_generic"`) si `isCacheableGeneric(prompt, normalizePrompt(prompt))` devuelve `false`. No hay bypass.
4. Busca en `ai_response_cache` (feature_key = `glossary`); si hit, devuelve.
5. Llama al proveedor:
   - Si `policy.provider === "apifreellm"` → `routeExternalOrFallback` (usa `callApiFreeLLM` como external, `callGateway` como fallback).
   - Si `lovable` → `callGateway` directo.
6. Guarda en caché (TTL largo, ~720h) porque las respuestas educativas son estables.
7. Descuenta 0 tokens Kari cuando viene de caché o de ApiFreeLLM (ahorro real al usuario).
8. Registra auditoría vía `recordAiAudit`.

System prompt: "Eres un divulgador médico. Responde en español, en 3-6 oraciones, únicamente información educativa general. Si la pregunta pide diagnóstico, dosis personalizada o interpretación de datos del paciente, responde 'Esta pregunta requiere valoración médica personalizada, consulta a Kari o a tu médico.' No inventes marcas comerciales."

Semilla de política: `feature_key='glossary'`, `provider='apifreellm'`, `model='gpt-3.5-turbo'`, `enable_cache=true`, `history_window=0`, `max_output_tokens=400`.

### 2. Rediseño del prompt de `ai-activity-coach`
Objetivo: que el prompt sea des-identificable para poder correr por ApiFreeLLM cuando la política y el consentimiento lo permitan.

Cambios en `supabase/functions/ai-activity-coach/index.ts`:
- **Reemplazar** `conditions = condRes.data.map(c => c.condition_name).join(", ")` por una **categorización** en 4 buckets fijos calculada en el edge (sin nombres): `cardiovascular`, `metabólico`, `respiratorio`, `otro`. Se envía sólo la lista de buckets activos (ej. `["cardiovascular","metabólico"]`) — perfil clínico genérico, no identificable.
- Reemplazar promedios crudos por rangos categóricos ("pasos_avg_bucket": `bajo|medio|alto`, "hr_bucket": `normal|elevado`, etc.) cuando `policy.provider === "apifreellm"`. Si es `lovable`, mantener valores exactos (ya es interno).
- Envolver la llamada con `routeExternalOrFallback` cuando `policy.provider !== "lovable"`. Si `blockedReason` no es null, fallback silencioso a Lovable con el prompt detallado original.

Sigue existiendo la variante "personalizada" en Lovable: si el usuario **no** ha dado consentimiento para el coach en ApiFreeLLM, la governance function `can_call_external_ai` bloquea y el orquestador cae a Lovable con el prompt completo — sin regresión de calidad para usuarios que no aceptan el proveedor externo.

Política default: `provider='lovable'`. Un admin la cambia a `apifreellm` conscientemente.

### 3. Gate de "no genérico" reutilizable
Añadir helper `assertGenericOrThrow(prompt)` en `supabase/functions/_shared/ai-router.ts` que:
- Llama `normalizePrompt` + `isCacheableGeneric` (ya existen en el mismo archivo).
- Si `false`, lanza un error tipado. Los endpoints capturan y devuelven `{ error: "Pregunta con datos personales, no puede usar proveedor educativo.", code: "not_generic" }`.
- `ai-glossary` lo llama siempre.
- `routeExternalOrFallback` gana un parámetro opcional `requireGeneric: boolean`; si es true y falla el gate, fuerza `blockedReason='not_generic'` y va al fallback (no bloquea al usuario, sólo evita salida externa). El coach lo usa así: si no es genérico, se queda internamente en Lovable aunque tuviera consentimiento.

### 4. UI: "Mis datos y IA" (`src/pages/MisDatosIA.tsx`)
- Añadir a `AI_FEATURES` en `useAiGovernance.ts` la entrada `{ key: "glossary", label: "Glosario educativo" }`.
- La lista de consentimientos ya renderiza dinámicamente cada feature; sólo hace falta:
  - Mostrar junto a cada feature el **proveedor configurado por admin** (leyendo `ai_provider_policy.provider`) — no sólo el del consentimiento del usuario. Nueva query `useAiPolicyProviders()` con SELECT público limitado a `feature_key, provider`.
  - Cuando `provider === 'apifreellm'`, mostrar badge amarillo "Proveedor externo" y un texto: "Al activar esta función tus prompts sanitizados salen a ApiFreeLLM. Si desactivas, se usa Lovable AI."
  - Cuando `provider === 'lovable'`, ocultar el switch (no hay decisión que tomar) y mostrar "Siempre interno" en gris.
- Default de consentimiento cambia: para features con proveedor externo el default es **opt-out** (`granted=false`); para lovable no aplica.

### 5. UI: Legal (`src/pages/Legal.tsx`)
Añadir sección nueva "Proveedores de IA externos" con:
- Lista dinámica desde `ai_external_providers` (nombre, endpoint, aviso legal, estado activo).
- Explicación clara: qué se sanitiza, qué features pueden usarlo, cómo revocar.
- Enlace a `/mis-datos-ia`.

### 6. Router en `App.tsx`
Ya existe `/mis-datos-ia`. Sin cambios de ruteo.

---

## Fuera de alcance
- No se toca Kari conversacional (`ai-kari-chat`) — se queda 100% en Lovable AI.
- No se activa ApiFreeLLM automáticamente en ninguna feature. El admin debe cambiar la política manualmente en `AiPolicyPanel`.
- No se cambia el modelo de tokens Kari (glosario sigue sin descontar tokens al usuario cuando cachea o va por ApiFreeLLM; cuando cae a fallback Lovable, se descuenta normal).

---

## Detalle técnico

### Migración SQL (una sola)
```sql
INSERT INTO public.ai_provider_policy
  (feature_key, label, model, max_input_tokens, max_output_tokens,
   history_window, enable_cache, cache_ttl_hours, provider, notes)
VALUES
  ('glossary', 'Glosario educativo', 'gpt-3.5-turbo',
   1000, 400, 0, true, 720, 'apifreellm',
   'Preguntas educativas genéricas sin PII. Rechaza prompts no genéricos.')
ON CONFLICT (feature_key) DO NOTHING;
```
No hay cambios de tablas; el schema ya soporta `provider` desde el turno anterior.

### Nuevos archivos
- `supabase/functions/ai-glossary/index.ts` — endpoint completo.
- (opcional) test manual con `supabase--curl_edge_functions`.

### Archivos modificados
- `supabase/functions/_shared/ai-router.ts`: agrega `assertGenericOrThrow`, extiende `routeExternalOrFallback` con `requireGeneric?: boolean`.
- `supabase/functions/ai-activity-coach/index.ts`: buckets clínicos + integración con `routeExternalOrFallback`.
- `src/hooks/useAiGovernance.ts`: nueva feature `glossary` en `AI_FEATURES`; nuevo hook `useAiPolicyProviders()`.
- `src/pages/MisDatosIA.tsx`: render diferenciado según proveedor de la política.
- `src/pages/Legal.tsx`: sección "Proveedores de IA externos".
- `supabase/config.toml`: no requiere cambios (verify_jwt=false por defecto no aplica; requiere JWT).

### Verificación
1. `supabase--curl_edge_functions /ai-glossary` con "¿qué es la hipertensión?" → 200, respuesta cacheable, `provider: 'apifreellm'`.
2. Mismo endpoint con "me duele la cabeza desde ayer" → 400 `not_generic`.
3. Segunda llamada idéntica al primer prompt → cache hit, sin tokens gastados.
4. Coach de actividad con política en `apifreellm` sin consentimiento → auditoría muestra `fallback_used=true, blocked_reason='consent_revoked'` y respuesta viene de Lovable.
5. Coach con consentimiento → payload no contiene nombres de condiciones, sólo buckets.
6. `MisDatosIA` muestra glosario con badge amarillo y switch funcional.

---

## Entregables y orden
1. Migración SQL (semilla glosario).
2. `assertGenericOrThrow` y `requireGeneric` en el shared router.
3. Nueva edge function `ai-glossary`.
4. Refactor `ai-activity-coach` (buckets + orquestador).
5. Hook `useAiPolicyProviders` + actualización `AI_FEATURES`.
6. UI `MisDatosIA` diferenciada por proveedor.
7. UI `Legal` con sección de proveedores externos.
8. Test manual con curl a ambos endpoints y revisión de auditoría.

Estimado: 1 sesión de build.

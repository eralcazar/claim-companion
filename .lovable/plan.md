# Plan: Optimización de costos de IA en CareCentral

**Objetivo:** reducir 40–70% el consumo de tokens/costos de Lovable AI en todas las features de IA (Kari, coach de actividad, sugerencias, resúmenes) **sin cambiar de proveedor** y **sin agregar riesgo legal**. Se apoya en cuatro palancas: router por feature, caché, poda de contexto y modelo correcto para cada tarea.

---

## Estado actual (verificado)

- `ai-kari-chat` usa `google/gemini-3-flash-preview` fijo o el modelo elegido en `ai_settings.kari_active_model`. Manda hasta **20 mensajes previos completos** en cada request → contexto grande = tokens caros.
- `ai-activity-coach` también consume tokens Kari con Gemini Flash.
- No hay caché: preguntas idénticas ("¿qué es la hipertensión?") gastan tokens cada vez.
- No hay política por feature: todo usa el mismo modelo/config aunque la tarea sea trivial.

Datos concretos de costos y consumo actual se validarán con `ai_gateway_logs--list_ai_gateway_requests` como primer paso del build para calibrar targets.

---

## Alcance en 4 bloques

### Bloque 1 — Router de IA por feature (~1 día)
Nueva tabla `ai_provider_policy` (por feature, admin-editable):
- `feature_key` (kari_chat, activity_coach, study_summary, glossary, etc.)
- `model` (`gemini-3-flash-preview` / `gemini-2.5-flash-lite` / `gemini-2.5-pro`)
- `max_input_tokens`, `max_output_tokens`
- `enable_cache` boolean
- `history_window` (cuántos mensajes previos incluir)

Edge function `ai-router` que resuelve la política y ejecuta la llamada centralizada. `ai-kari-chat` y `ai-activity-coach` se refactorizan para pasar por el router.

Beneficio: cambiar modelo/límites por feature sin redeploy. Base para todo lo demás.

### Bloque 2 — Caché semántico de respuestas frecuentes (~2 días)
Nueva tabla `ai_response_cache`:
- `feature_key`, `prompt_hash` (SHA-256 del prompt normalizado), `prompt_normalized`, `response`, `model`, `tokens_saved`, `hit_count`, `created_at`, `expires_at`.

Flujo:
1. Antes de llamar al modelo, normalizar prompt (lowercase, quitar puntuación, quitar tokens PII con regex simple) y calcular hash.
2. Si existe entrada válida en caché → devolver respuesta sin consumir tokens, incrementar `hit_count`, **no cobrar tokens Kari** al usuario.
3. Si no, llamar al modelo, guardar respuesta si el prompt es "genérico" (clasificador simple por patrones: preguntas sin nombres/fechas/números específicos del paciente).

Solo se cachea contenido **educativo genérico** (glosario, definiciones, "para qué sirve X medicamento" sin dosis). Prompts con contexto personal (síntomas específicos, mediciones) **nunca se cachean** para no cruzar información entre pacientes.

Beneficio esperado: 20–40% hit rate en Kari (preguntas médicas comunes se repiten mucho entre usuarios).

### Bloque 3 — Poda inteligente de contexto en Kari (~1 día)
Cambios en `ai-kari-chat`:
- Reducir ventana de historial de 20 → **8 mensajes** por defecto, configurable en `ai_provider_policy`.
- Compresión de historial: si la conversación tiene >12 mensajes, resumir los primeros N en 1–2 párrafos con una llamada barata a `gemini-2.5-flash-lite`, y mantener solo los últimos 6 mensajes literales + resumen.
- Truncar mensajes individuales del usuario >2000 chars con resumen (el límite actual es 4000).
- System prompt actual (~500 tokens) → versión compacta (~200 tokens) sin perder reglas de seguridad.

Beneficio esperado: 30–50% menos tokens de input por request en conversaciones largas.

### Bloque 4 — Modelo correcto por tarea + selector admin (~1 día)
Ajuste de defaults en `ai_provider_policy`:
- **Kari chat conversacional** → `gemini-3-flash-preview` (default actual, correcto).
- **Coach de actividad** (texto estructurado corto) → `gemini-2.5-flash-lite` (~4x más barato en output).
- **Glosario / definiciones cortas** → `gemini-2.5-flash-lite`.
- **Resúmenes de estudios largos** → `gemini-2.5-flash` (mejor calidad para clínico).
- **Casos complejos con imagen** (futuro OCR) → `gemini-2.5-pro`.

UI admin en `KariUsageAdmin.tsx`: tabla editable de políticas por feature con preview de costo estimado por 1k requests.

Métricas visibles: tokens ahorrados por caché en los últimos 30 días, distribución de costo por feature, hit rate del caché.

---

## Fuera de alcance (explícito)

- NO integrar ApiFreeLLM ni otros proveedores gratuitos anónimos.
- NO cambiar el modelo de negocio de tokens Kari (los usuarios siguen pagando lo mismo).
- NO tocar features de IA con visión (OCR de estudios) — quedan en Lovable AI sin cambio.
- NO modificar consentimientos ni aviso de privacidad (no aplica: seguimos con proveedor ya declarado).

---

## Detalle técnico

**Migración SQL:**
- `ai_provider_policy` (id, feature_key unique, model, max_input_tokens, max_output_tokens, enable_cache, history_window, updated_at)
- `ai_response_cache` (id, feature_key, prompt_hash unique-per-feature, prompt_normalized, response, model, tokens_saved, hit_count, created_at, expires_at, índice en prompt_hash+feature_key)
- Grants + RLS: solo admin lee/escribe policy; cache es server-only (grant solo a service_role).
- Seed de políticas default para las features actuales.

**Edge functions:**
- `ai-router` (nueva): recibe `{feature_key, messages, user_id}`, aplica política, verifica caché, llama gateway con `createLovableAiGatewayProvider`, guarda en caché si aplica, devuelve `{response, tokens_used, cached: bool, model}`.
- `ai-kari-chat`: refactor para delegar la llamada al modelo a `ai-router`. Mantiene toda la lógica de tokens Kari, conversaciones, límites mensuales.
- `ai-activity-coach`: mismo refactor.

**Frontend:**
- `KariUsageAdmin.tsx`: nueva pestaña "Políticas y caché" con tabla editable + métricas.
- `Kari.tsx`: badge sutil "Respuesta del caché" cuando aplique, para transparencia (opcional, discutible).
- Hook `useAiPolicies` para admin.

**Verificación:**
1. Antes de empezar: `list_ai_gateway_requests` últimos 30 días para baseline de tokens/costo por feature.
2. Test manual de Kari con preguntas repetidas → segunda vez debe ser cache hit.
3. Test de conversación larga (15 mensajes) → verificar compresión y ventana reducida.
4. Comparar tokens en `ai_gateway_logs` antes vs después de deploy.

---

## Entregables y orden

1. Migración SQL (tablas + grants + RLS + seed).
2. `ai-router` edge function + tests curl.
3. Refactor `ai-kari-chat` para usar router + poda de contexto.
4. Refactor `ai-activity-coach` para usar router.
5. UI admin en `KariUsageAdmin.tsx`.
6. Verificación con logs del gateway y ajuste de defaults.

Total estimado: **5 días de desarrollo**. Ahorro esperado: **40–70% en costo de tokens de IA** manteniendo calidad y cero riesgo legal nuevo.

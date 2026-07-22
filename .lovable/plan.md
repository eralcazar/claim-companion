# Integrar ApiFreeLLM como proveedor externo en Políticas de IA

Objetivo: permitir elegir **ApiFreeLLM** como modelo por feature en `ai_provider_policy`, reutilizando toda la gobernanza que ya existe (kill switch, consentimiento por feature, sanitización, PII residual, auditoría automática, fallback a Lovable AI). Sin retirar Lovable AI: ApiFreeLLM es **opción opcional** y solo se usa cuando (a) el admin la eligió para esa feature, (b) el kill switch global está encendido y (c) el usuario dio consentimiento explícito para esa feature con ese proveedor.

---

## 1. Base de datos (una migración)

- `ai_provider_policy`: agregar
  - `provider text NOT NULL DEFAULT 'lovable'` (`'lovable'` | `'apifreellm'`)
  - `external_endpoint text` (para ApiFreeLLM u otros; nulo cuando provider = lovable)
  - `requires_consent boolean NOT NULL DEFAULT false` (true cuando provider != 'lovable')
- Seed / update: dejar todas las políticas actuales con `provider='lovable'`.
- Registrar ApiFreeLLM en una nueva tabla ligera `ai_external_providers` (id text PK, nombre, endpoint, aviso legal corto, activo boolean) para poder listar/desactivar sin código. RLS: admin escribe, autenticados leen.
- Ampliar `can_call_external_ai(_user_id, _feature_key)`:
  - Si la política de la feature tiene `provider='lovable'`, devolver `{allowed:true, provider:'lovable'}` (no aplica gate externo).
  - Si tiene `provider!='lovable'`, exigir kill switch encendido + consentimiento activo + proveedor activo en `ai_external_providers`.
- GRANTs y RLS estándar (admin gestiona política y proveedores; usuarios ven su propia consent row — ya existe).

## 2. Router compartido (`supabase/functions/_shared/ai-router.ts`)

- `loadPolicy` devuelve también `provider` y `external_endpoint`.
- Nuevo helper `callApiFreeLLM(endpoint, messages, opts)` con formato OpenAI-compatible (tal como el gateway actual) y timeout de 8s.
- Nuevo orquestador `routeByPolicy({admin, userId, policy, rawUserPrompt, messages, ...})` que:
  1. Si `policy.provider === 'lovable'` → llama `callGateway(...)` directamente (comportamiento actual).
  2. Si es externo → envuelve la llamada en `routeExternalOrFallback` que ya existe (kill switch, consentimiento, sanitización, PII residual, auditoría) con:
     - `external: () => callApiFreeLLM(policy.external_endpoint, sanitizedMessages, ...)`
     - `fallback: () => callGateway(apiKey, DEFAULT_LOVABLE_MODEL, sanitizedMessages, ...)`
     - Todas las llamadas externas usan `messages` sanitizados (system prompt intacto + user prompt reemplazado por `normalizePrompt` cuando contenga PII).
- `ai-kari-chat` y `ai-activity-coach` cambian una línea: usan `routeByPolicy` en vez de llamar `callGateway` directo. Toda la lógica de descuento de tokens, historial y caché se mantiene.

## 3. Frontend

- `src/hooks/useAiPolicies.ts`
  - Extender `AI_MODEL_CHOICES` con etiqueta de proveedor (`lovable` | `apifreellm`) y modelos ApiFreeLLM que expongan (p.ej. `apifreellm/mistral-small`, `apifreellm/llama-3-8b`) tomados del registro `ai_external_providers`.
  - Cargar la lista efectiva desde la tabla al montar (para no hardcodear).
- `src/components/admin/AiPolicyPanel.tsx`
  - Al elegir un modelo con `provider='apifreellm'`: mostrar aviso amarillo "Este proveedor es externo. Requiere consentimiento del usuario y activa el modo sanitizado obligatorio."
  - Selector separado de proveedor (radio: Lovable AI / ApiFreeLLM) que filtra los modelos disponibles.
- `src/pages/MisDatosIA.tsx`
  - Ya lista consentimientos por feature. Añadir columna "Proveedor actual" leído de `ai_provider_policy.provider` para que el usuario vea a quién autoriza al aceptar.
- `src/components/ai/AiProviderStatusBanner.tsx`
  - Mostrar "Modo seguro (Lovable AI)" cuando la feature en uso resolvió fallback por consent/kill switch.

## 4. Legal (obligatorio antes de encender ApiFreeLLM en cualquier feature)

- Editar `src/pages/Legal.tsx` para agregar sección **"Proveedores externos de IA"** con:
  - Nombre del proveedor (ApiFreeLLM), URL, país de procesamiento, base legal (consentimiento LFPDPPP art. 8-9).
  - Qué se envía: prompt **sanitizado** (sin CURP, RFC, email, teléfono, direcciones, fechas, números largos, coordenadas).
  - Qué no se envía: identificadores del paciente, expediente, historial médico crudo.
  - Derecho ARCO: enlace a `/derechos-arco` (ya existe).
  - Retención en el proveedor y cómo revocar (link a `/mis-datos-ia`).
- Nuevo texto de consentimiento por feature (versionado) que el usuario debe firmar en `/mis-datos-ia` antes de que ApiFreeLLM procese cualquier request.
- Bloque en `AiPolicyPanel` que impida guardar una política con provider externo si no existe el texto legal publicado para esa feature (validación en migración: check en tabla `ai_external_providers.legal_version`).

## 5. Pruebas

- `src/test/ai-sanitize.test.ts`: ya cubre PII; sin cambios.
- Nuevo `src/test/ai-router-provider-selection.test.ts` (extiende `ai-router-governance.test.ts`) — Vitest con mocks:
  - Política `provider='apifreellm'` + consent revocado → fallback a Lovable, `blockedReason='consent_revoked'`, `provider='lovable'` en el registro de auditoría.
  - Política externa + consent OK + prompt con CURP → prompt sale sanitizado (assertion sobre el body enviado al mock de ApiFreeLLM).
  - Política externa + consent OK + prompt con dirección residual → bloquea a fallback, `blockedReason='residual_pii'`.
  - Política externa + kill switch OFF → fallback.
  - Política `provider='lovable'` → nunca consulta consent ni sanitiza (comportamiento actual).

## 6. Fuera de alcance

- No enviar imágenes / audio / documentos a ApiFreeLLM (solo texto conversacional). Features de OCR (`extract-study-indicators`, `detect-form-fields`) permanecen locked a Lovable AI en la migración.
- No cambiar precios/tokens Kari (ApiFreeLLM es gratuito upstream pero seguimos cobrando los mismos tokens al usuario para mantener modelo económico y cubrir costos de infra/moderación).

## Detalle técnico

Endpoints ApiFreeLLM: `https://apifreellm.com/api/chat/completions` (OpenAI-compatible, sin API key). Timeout duro 8s; en `error/timeout/429` → fallback automático a Lovable AI (ya cubierto por `routeExternalOrFallback` porque cualquier throw cae en el catch y registra `status:error:*` — extender para que ese catch también dispare `fallback()` en vez de dejar contenido vacío).

Cambio menor a `routeExternalOrFallback`: si `external()` lanza o retorna vacío, ejecutar `fallback()` y marcar `fallbackUsed=true` con `blockedReason='external_error'`. Actualizar test correspondiente.

## Orden de entrega

1. Migración SQL (schema + `can_call_external_ai` + seed proveedor ApiFreeLLM inactivo por defecto).
2. Router (`ai-router.ts`) + refactor de `ai-kari-chat` y `ai-activity-coach`.
3. UI admin (`AiPolicyPanel` con selector de proveedor + aviso).
4. Legal (`Legal.tsx` + textos de consentimiento versionados).
5. `MisDatosIA` extendido y banner de estado.
6. Tests.

Estimado: ~1.5 días. ApiFreeLLM queda **registrado pero inactivo** hasta que un admin lo encienda en `ai_external_providers` y elija una feature; ninguna llamada sale al exterior sin consentimiento explícito del usuario final.

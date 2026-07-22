
## Objetivo

Permitir que el superadmin configure sus propias API keys de **Gemini (todas las versiones)** y **Mistral** como proveedores externos en el registro `ai_external_providers`, con una pantalla dedicada de configuración, cambios legales necesarios y enrutamiento gobernado igual que ApiFreeLLM.

## 1. Base de datos

Migración `ai_external_providers` (ya existente):
- Agregar columnas: `requires_api_key boolean default false`, `secret_name text` (nombre del secret backend, ej. `GEMINI_API_KEY`, `MISTRAL_API_KEY`), `models jsonb` (lista de modelos soportados con su id y label).
- Seed de 2 nuevos proveedores:
  - `gemini` — endpoint OpenAI-compatible `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, `secret_name='GEMINI_API_KEY'`, modelos: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite`, `gemini-3.5-flash`.
  - `mistral` — endpoint `https://api.mistral.ai/v1/chat/completions`, `secret_name='MISTRAL_API_KEY'`, modelos: `mistral-large-latest`, `mistral-small-latest`, `open-mistral-nemo`, `codestral-latest`.
- Ambos `activo=false` por defecto (se activan cuando el superadmin guarde su key).
- RLS: `SELECT` para authenticated; `UPDATE/INSERT` solo `has_role(admin)`.

## 2. Secrets (backend)

Usar `add_secret` para provisionar `GEMINI_API_KEY` y `MISTRAL_API_KEY` cuando el superadmin lo solicite desde la UI. La UI abre el formulario seguro nativo — no se persiste la key en texto plano ni en la tabla.

## 3. Router `supabase/functions/_shared/ai-router.ts`

- Añadir `callGeminiBYOK(endpoint, apiKey, model, messages, opts)` y `callMistral(endpoint, apiKey, model, messages, opts)` — ambos OpenAI-compatible, mismo shape que `callApiFreeLLM`.
- Extender `routeExternalOrFallback` para leer `provider` de la política y despachar al helper correcto. Cada helper lee su secret con `Deno.env.get(provider.secret_name)`; si falta, degrada a fallback interno con `blockedReason='missing_api_key'` y registra en `ai_provider_audit`.
- Mantener `requireGeneric`, sanitización y kill-switch iguales.

## 4. UI Superadmin — nueva pantalla

Ruta nueva: `/admin/ai-providers` (guarded por `admin`).

- Lista de proveedores desde `ai_external_providers`.
- Por cada proveedor externo con `requires_api_key=true`:
  - Estado: "Configurado" (secret presente) / "Sin API key".
  - Botón **"Configurar API key"** → llama `add_secret({name: secret_name})`.
  - Botón **"Rotar API key"** → llama `update_secret`.
  - Toggle **Activo** (actualiza `ai_external_providers.activo`).
  - Selector de modelos permitidos.
  - Link a docs oficiales del proveedor.
- Enlace visible desde `AiPolicyPanel.tsx` ("Gestionar proveedores externos").

Añadir entrada en `AppSidebar.tsx` bajo Admin.

## 5. `AiPolicyPanel.tsx` y `useAiPolicies`

- El dropdown de `provider` en cada política ahora incluye dinámicamente: `internal`, `apifreellm`, `gemini`, `mistral` (leído de `ai_external_providers` activos).
- Al elegir proveedor externo, mostrar warning si no hay key configurada.

## 6. UI paciente `/mis-datos-ia`

- El hook `useAiPolicyProviders` ya lee de la tabla — mostrar badges por proveedor (Gemini/Mistral) con consentimiento independiente. Default opt-out.

## 7. Legales

`src/pages/Legal.tsx` — sección "Proveedores de IA externos":
- Añadir a la lista: Google Gemini (política Google), Mistral AI (política Mistral, servidores UE).
- Nota: cuando el superadmin conecta su propia API key, la relación contractual con Google/Mistral es del operador de CareCentral, no de Lovable.
- Reiterar sanitización PII, opt-out y kill switch.

## 8. Verificación

- Test unitario: `routeExternalOrFallback` degrada a fallback si `GEMINI_API_KEY`/`MISTRAL_API_KEY` faltan.
- Smoke test manual: configurar key dummy → llamada real a `ai-glossary` con provider `gemini` → verificar registro en `ai_provider_audit`.

## Detalles técnicos

- Endpoints OpenAI-compatible para ambos → misma estructura de body/response; reusar la firma de `callApiFreeLLM`.
- No persistir API keys en DB. Solo `secret_name` como referencia.
- `has_role(auth.uid(),'admin')` protege escritura de `ai_external_providers` y acceso a `/admin/ai-providers`.
- `gemini` OpenAI-compat requiere header `Authorization: Bearer <key>`; `mistral` idem.
- No cambiar cost accounting: llamadas externas siguen sin descontar tokens del usuario, se registran en auditoría con proveedor real.

```text
[Kari/Coach/Glossary] → routeExternalOrFallback
        │
        ├─ policy.provider = 'gemini'  → Deno.env.GEMINI_API_KEY  → Google endpoint
        ├─ policy.provider = 'mistral' → Deno.env.MISTRAL_API_KEY → Mistral endpoint
        ├─ policy.provider = 'apifreellm' → ApiFreeLLM
        └─ fallback → Lovable AI Gateway
```

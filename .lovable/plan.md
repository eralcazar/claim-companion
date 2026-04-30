## Plan unificado: Planes/OCR visibles + Chat IA "Kari" con tokens comprables

Combina las dos peticiones recientes en un solo entregable.

---

## Parte A — Acceso a Planes / OCR + medidor real + alertas

### A1. Sidebar y bottom nav

En `src/components/AppSidebar.tsx`, nuevo grupo **"Mi cuenta"** (siempre visible para usuarios autenticados, sin depender de la matriz de permisos):
- **Mis planes** → `/planes` (icono `CreditCard`)
- **Mi suscripción** → `/suscripcion` (icono `BadgeCheck`)
- **Escaneos OCR** → `/planes#ocr` (icono `Sparkles`) con **badge en vivo** del saldo (verde ≥5, amarillo 1-4, rojo 0).
- **Pregúntale a Kari** → `/kari` (icono `Sparkles` brand) con **badge** del saldo de tokens de IA.

En `BottomNav.tsx`: añadir entrada "Kari" (mobile prioriza el chat).

### A2. Conteo real de páginas escaneadas

Hoy `extract-study-indicators` cobra 1 página fija. Cambios:
- En el edge function, contar páginas reales del PDF con regex sobre el binario:
  ```ts
  const text = new TextDecoder('latin1').decode(new Uint8Array(arrayBuf));
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length || 1;
  ```
  Para imágenes (PNG/JPG/WEBP) → 1 página.
- Llamar `consume_ocr_quota(_pages = pages)` en lugar de `1`.
- Devolver `pages_charged` al cliente.

En `ResultadosManager.tsx`:
- Antes de subir, leer el PDF con `pdfjs` (worker ya existe) y mostrar **"N páginas → consumirá N escaneos"**.
- Si excede `totalQuota(quota)` → bloquear botón y abrir modal "Sin escaneos".

### A3. Alertas de cuota OCR

- Componente `src/components/ocr/OutOfQuotaDialog.tsx`: modal con saldo + botón **"Comprar más escaneos"** → `/planes#ocr`.
- Disparadores: respuesta 402 del edge, hook `useOcrLowBalanceAlert` que escucha realtime sobre `ocr_quotas` y muestra toast persistente cuando llega a 0.
- Banner amarillo permanente en Estudios cuando `totalQuota ≤ 3`.

Migración: `ALTER PUBLICATION supabase_realtime ADD TABLE public.ocr_quotas;`

### A4. Saldo OCR en el Gestor de Usuarios (admin)

`src/pages/admin/UserManager.tsx`:
- Columna **"Escaneos OCR"** = `subscription_balance + addon_balance`.
- Hook `useAllOcrQuotas` (admin lee toda la tabla; añadir policy SELECT admin si falta).
- Botón "Añadir escaneos" → diálogo (cantidad) → `useAdminGrantOcr` (ya existe).

### A5. Encabezado en `/estudios`

Tarjeta superior con saldo + barra vs total del plan + botón "Comprar más" → `/planes#ocr`. Anchor `id="ocr"` en `Plans.tsx`.

---

## Parte B — Chat IA "Kari" con tokens comprables

### B1. Decisión de proveedor

**Lovable AI Gateway** (ya configurado, sin necesidad de conectar cuentas externas) + **Stripe** (ya configurado para los packs OCR). Modelo por defecto: `google/gemini-3-flash-preview`. Cobro en **MXN** vía Embedded Checkout.

### B2. Base de datos (migración)

- `ai_token_packs` — paquetes (`id`, `nombre`, `descripcion`, `tokens`, `precio_centavos`, `moneda`='MXN', `stripe_product_id`, `stripe_price_id`, `activo`, `orden`). RLS: lectura autenticados activos, escritura admin.
- `ai_token_balances` — `user_id PK`, `balance int default 0`, `updated_at`. RLS: dueño lee, admin lee todo. Realtime ON.
- `ai_token_purchases` — historial con `status`, `stripe_session_id`, `environment`. RLS dueño + admin.
- `ai_chat_conversations` — `id`, `user_id`, `title`, timestamps. RLS dueño.
- `ai_chat_messages` — `conversation_id`, `role`, `content`, `tokens_used`, `created_at`. RLS dueño.

Funciones SECURITY DEFINER:
- `add_ai_tokens(_user_id, _tokens)` — suma al balance (llamada desde webhook).
- `consume_ai_tokens(_user_id, _tokens)` — resta o retorna `insufficient`.
- Modificar `handle_new_user`: regalar **2,000 tokens** de bienvenida (~10 conversaciones cortas).

Features nuevos en `src/lib/features.ts`: `kari_chat`, `kari_tokens` (default ON para paciente/medico/enfermero).

### B3. Productos Stripe (sandbox)

Crear con `payments--batch_create_product`:
- `kari_tokens_mini` — 10,000 tokens — **$49 MXN**
- `kari_tokens_plus` — 50,000 tokens — **$199 MXN**
- `kari_tokens_pro` — 200,000 tokens — **$599 MXN**

Migración secundaria llena `ai_token_packs.stripe_price_id` con los IDs creados. Al publicar, Stripe sincroniza a live automáticamente.

### B4. Edge functions

**`ai-kari-chat`** (validación de JWT en código)
- Input: `{ conversation_id?, message }`. Crea conversación si falta.
- Carga últimos ~20 mensajes de contexto.
- Verifica balance pre-llamada (estimación). Si insuficiente → 402 con `code: 'insufficient_tokens'`.
- Llama Lovable AI Gateway (`google/gemini-3-flash-preview`, non-streaming primero, streaming en V2).
- System prompt en backend (no editable en cliente):
  ```
  Eres Kari, asistente de salud digital de CareCentral. Español de México, cálida y clara.
  REGLAS CRÍTICAS:
  - NO eres médico. NO diagnosticas, NO prescribes, NO ajustas dosis.
  - Emergencia (dolor torácico intenso, dificultad respiratoria, pérdida de conciencia,
    sangrado abundante, signos de infarto/ACV): responde PRIMERO
    "⚠️ Esto puede ser una emergencia. Llama al 911 o acude a urgencias inmediatamente."
  - Síntomas significativos: recomienda consultar profesional.
  - Puedes: explicar términos médicos, orientar cuándo buscar atención, ayudar a entender
    estudios o recetas, consejos generales de bienestar, navegar la app.
  - Fuera de salud: redirige amablemente.
  ```
- Persiste user + assistant con `tokens_used = usage.total_tokens` real.
- `consume_ai_tokens(user_id, total_tokens)`.
- Maneja 429 (rate limit) y 402 (créditos Lovable AI agotados) → mensajes claros al cliente.

**`ai-tokens-checkout`** (JWT en código)
- Input `{ pack_id }` → crea Stripe Checkout Session (`mode: payment`, one-time) con `metadata.kind='ai_tokens'`, `metadata.user_id`, `metadata.tokens`.
- Inserta `ai_token_purchases` con status `pending`.
- Devuelve `clientSecret` para `EmbeddedCheckout`.

**`payments-webhook`** (existente) — extender:
- Si `metadata.kind === 'ai_tokens'` y evento `checkout.session.completed`:
  - `ai_token_purchases.status='completed'`
  - `add_ai_tokens(user_id, tokens)`

### B5. UI

- `src/components/kari/KariFloatingButton.tsx` — burbuja fija abajo-derecha en todas las páginas autenticadas (oculta en `/login`, `/legal`, `/kari`). Avatar Kari + badge de saldo.
- `src/components/kari/KariChatPanel.tsx` — Sheet derecho. Header con avatar + saldo + cerrar. Welcome card con sugerencias ("Explícame mi último estudio", "¿Qué hace este medicamento?"). `react-markdown` para renderizar respuestas. Disclaimer permanente. Banner "Sin tokens → Comprar" cuando saldo = 0.
- `src/pages/Kari.tsx` (`/kari`) — chat full-screen + lista lateral de conversaciones + "Nueva conversación".
- `src/pages/KariTokens.tsx` (`/kari/tokens`) — cards con packs activos + Embedded Checkout + historial.
- `src/hooks/useKariTokens.ts` — `{balance, loading}` con realtime sobre `ai_token_balances`.
- `src/hooks/useKariChat.ts` — `messages`, `sendMessage`, `conversationId`, manejo 402/429.

### B6. Dependencias

`bun add react-markdown` (única dependencia nueva).

---

## Resumen de archivos a crear/editar

**Crear:** `src/components/kari/KariFloatingButton.tsx`, `KariChatPanel.tsx`, `src/pages/Kari.tsx`, `src/pages/KariTokens.tsx`, `src/hooks/useKariTokens.ts`, `src/hooks/useKariChat.ts`, `src/components/ocr/OutOfQuotaDialog.tsx`, `src/hooks/useOcrLowBalanceAlert.ts`, edge functions `ai-kari-chat` y `ai-tokens-checkout`.

**Editar:** `src/components/AppSidebar.tsx`, `BottomNav.tsx`, `src/components/AppLayout.tsx` (montar burbuja Kari + alerta OCR), `src/lib/features.ts`, `src/App.tsx` (rutas `/kari`, `/kari/tokens`), `src/pages/Plans.tsx` (anchor `#ocr`), `src/pages/Estudios.tsx` (encabezado saldo), `src/pages/admin/UserManager.tsx` (columna OCR), `src/components/estudios/ResultadosManager.tsx` (preview páginas + bloqueo + modal), `supabase/functions/extract-study-indicators/index.ts` (conteo real), `supabase/functions/payments-webhook/index.ts` (handler `ai_tokens`).

**Migraciones:** crear las 5 tablas de IA + funciones + trigger de bienvenida; `ALTER PUBLICATION supabase_realtime` para `ocr_quotas` y `ai_token_balances`; SELECT policy admin sobre `ocr_quotas` si falta. Seed de 3 packs (`stripe_price_id` NULL al inicio, se llenan tras crear productos en Stripe).

## Fuera de alcance
- Streaming token-por-token (UI lista para enchufarlo en V2).
- RAG sobre el expediente del paciente (memoria cruzada).
- Subir imágenes/PDF directo al chat de Kari.
- Stripe LIVE — se activa al publicar.

¿Apruebo y procedo a implementar todo?

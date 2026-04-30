## Objetivo

Permitir al admin asignar (regalar) tokens de Kari (IA) directamente desde el **Gestor de Usuarios** (`/admin/usuarios`), sin pasar por Stripe, similar al flujo actual de "Regalar escaneos OCR".

## Cambios

### 1. Nueva Edge Function: `admin-grant-ai-tokens`

Archivo: `supabase/functions/admin-grant-ai-tokens/index.ts`

- Verifica que el llamador sea `admin` (mismo patrón que `admin-grant-ocr`).
- Recibe `{ user_id, tokens }`, valida `tokens > 0`.
- Llama al RPC existente `add_ai_tokens(_user_id, _tokens)` con service role (suma al balance + `lifetime_granted`).
- Inserta un registro en `ai_token_purchases` con `status='granted'`, `amount_cents=0`, `environment='sandbox'`, `pack_id=null` para auditoría/historial.

### 2. UI en `UserRolesRow.tsx`

- Nueva columna en la tabla **"Tokens Kari"** (junto a "Escaneos OCR") mostrando un Badge con el balance actual del usuario y tooltip con `lifetime_granted` / `lifetime_consumed`.
- Nuevo botón de acción con ícono `Sparkles` (Kari) que abre un diálogo **"Regalar tokens de Kari"** con input numérico (default 1000, paso 500) y presets rápidos (1k / 5k / 10k).
- Al confirmar, invoca la edge function y refresca `users_with_roles`.

### 3. Datos en `UserManager.tsx`

- Ampliar el query `users_with_roles` para incluir `ai_token_balances` (`balance`, `lifetime_granted`, `lifetime_consumed`) por usuario, igual que se hace hoy con `ocr_quotas`.
- Pasar `kariBalance` al `UserRolesRow` como prop.
- Agregar la nueva columna `<TableHead>Tokens Kari</TableHead>` y actualizar `colCount`.

### 4. Hook auxiliar

Crear `useAdminGrantAiTokens` en `src/hooks/useAiTokenPacks.ts` (o nuevo archivo) que invoque `supabase.functions.invoke("admin-grant-ai-tokens", ...)` e invalide `users_with_roles` + `kari_balance`.

## Detalles técnicos

- Reutilizamos el RPC `public.add_ai_tokens` que ya existe (atomic upsert sobre `ai_token_balances`).
- El registro en `ai_token_purchases` con `status='granted'` permite que aparezca en el historial de compras de Kari del usuario (ya consultado por `useMyKariPurchases`).
- No requiere cambios de schema ni nuevas RLS — el grant lo hace la edge function con service role.
- La columna nueva solo se muestra para usuarios con feature `kari_tokens` activa (todos excepto laboratorio/farmacia), pero por simplicidad se muestra siempre y el balance será 0 si no aplica.

## Resultado esperado

El admin entra a `/admin/usuarios`, ve el balance de tokens Kari de cada usuario, y con un clic puede regalar N tokens que se acreditan al instante en el balance del usuario y quedan registrados en el historial.
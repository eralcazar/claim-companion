# Control fino de tokens de Kari + acceso "Pregúntale a Kari" en matriz

## Lo que falta hoy y se va a entregar

1. `kari` no aparece en `/admin/perfiles-acceso` porque no está registrado como feature → se agrega.
2. No hay log granular de consumo → tabla `ai_token_usage_log`.
3. No hay vista admin de uso → `/admin/kari-uso`.
4. No hay alertas de saldo bajo → banner en chat.
5. No hay límites mensuales por rol/paquete → tabla `ai_token_monthly_limits` + función de chequeo.
6. No se calcula costo real → micro-USD por modelo en cada respuesta.

---

## 1. Registrar Kari como feature de permisos

Editar `src/lib/features.ts`:
- Agregar `"kari"` al union `FeatureKey`.
- Insertar `{ key: "kari", label: "Pregúntale a Kari", route: "/kari", icon: Sparkles, group: "principal" }`.
- Agregar `"kari_tokens"` (compra de paquetes) → `{ key: "kari_tokens", label: "Tokens de Kari", route: "/kari/tokens", icon: Sparkles, group: "principal" }`.

Sembrar matriz inicial via migración `INSERT … ON CONFLICT DO NOTHING` en `role_permissions` y `plan_role_features` para `kari` y `kari_tokens` activados a todos los roles en todos los paquetes (admin puede afinar después).

Proteger las rutas con `user_has_feature_access` (igual al patrón de Estudios/Tendencias) en `src/components/AppSidebar.tsx`, `BottomNav.tsx`, `KariFloatingButton.tsx` y `App.tsx` (ProtectedRoute con feature key).

## 2. Tabla `ai_token_usage_log`

Migración nueva. Columnas: `id`, `user_id`, `conversation_id`, `message_id`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost_usd_micros bigint`, `created_at`. Índices en `(user_id, created_at desc)` y `(created_at desc)`.

RLS: SELECT propio o admin; INSERT solo service role.

Backfill opcional: insertar filas históricas desde `ai_chat_messages` donde `role='assistant' AND tokens_used > 0` (sin costo, sin model).

## 3. Tabla `ai_token_monthly_limits`

Columnas: `id`, `plan_id` (nullable = aplica a todos), `role app_role`, `monthly_token_cap int`, `enabled bool`. Único `(plan_id, role)`.

Función `check_kari_monthly_limit(_user_id) returns jsonb` que devuelve `{ allowed, used_this_month, cap, resets_at }` consultando `ai_token_usage_log` del mes actual y el cap más restrictivo aplicable.

Sembrar valores por defecto: paciente Gratuito = 5000/mes, otros roles sin tope.

## 4. Edge function `ai-kari-chat`

- Antes del modelo: validar `check_kari_monthly_limit`. Si excede → HTTP 429 `{ code: 'monthly_limit_reached', resets_at }`.
- Después de obtener `usage` del Lovable AI Gateway: calcular `cost_usd_micros` con tabla constante por modelo, insertar fila en `ai_token_usage_log`.
- En la respuesta agregar `low_balance: boolean` (`balance < 500 && balance > 0`) y `monthly_used`/`monthly_cap` cuando aplique.

Tabla de costos (micro-USD por token):
- `gemini-3-flash-preview`: input 30, output 250
- `gemini-2.5-flash`: input 30, output 250
- `gemini-2.5-pro`: input 1250, output 5000

## 5. Alerta de saldo bajo en cliente

- `useKariBalance`: derivar `isLow`, `isEmpty`.
- Nuevo `src/components/kari/LowBalanceBanner.tsx` (amarillo si low, rojo si empty, CTA "Comprar tokens").
- Integrar en `KariChatPanel.tsx` (header) y `Kari.tsx`.
- Manejar `monthly_limit_reached` en `useKariChat` con toast claro y banner persistente.

## 6. Página admin `/admin/kari-uso`

Nuevo `src/pages/admin/KariUsageAdmin.tsx` (acceso solo admin):

- KPIs mes actual: tokens vendidos, consumidos, costo USD, margen, usuarios activos.
- Filtros de rango de fechas.
- Gráfico recharts: consumo diario últimos 30 días.
- Tabla por usuario (email, mensajes, tokens, costo USD, última actividad), buscador, paginación 50.
- Botón "Exportar CSV".
- Sección "Límites mensuales" → editor CRUD de `ai_token_monthly_limits`.

Componentes/hooks nuevos:
- `src/hooks/useKariUsageAdmin.ts`
- `src/components/admin/KariMonthlyLimitsEditor.tsx`
- `src/lib/exportKariUsageCSV.ts`

RPCs (security definer, requieren admin):
- `get_kari_usage_summary(_from, _to) returns jsonb`
- `get_kari_usage_by_user(_from, _to, _limit, _offset) returns setof record`

Entrada en sidebar admin "Uso de Kari" (icono Sparkles) y registrarla como feature `kari_admin` para que también sea controlable desde la matriz.

---

## Archivos a crear

- migración SQL (tablas, función, RPCs, seeds)
- `src/pages/admin/KariUsageAdmin.tsx`
- `src/hooks/useKariUsageAdmin.ts`
- `src/components/admin/KariMonthlyLimitsEditor.tsx`
- `src/components/kari/LowBalanceBanner.tsx`
- `src/lib/exportKariUsageCSV.ts`

## Archivos a editar

- `supabase/functions/ai-kari-chat/index.ts`
- `src/lib/features.ts` (agregar `kari`, `kari_tokens`, `kari_admin`)
- `src/App.tsx` (ruta admin nueva, ProtectedRoute con feature)
- `src/components/AppSidebar.tsx` (entrada admin)
- `src/components/BottomNav.tsx` (filtro por feature)
- `src/components/kari/KariFloatingButton.tsx` (esconder si sin acceso)
- `src/hooks/useKariTokens.ts` (`isLow`, `isEmpty`)
- `src/hooks/useKariChat.ts` (manejar `monthly_limit_reached` y `low_balance`)
- `src/components/kari/KariChatPanel.tsx` y `src/pages/Kari.tsx` (banner)

## Memoria

- Actualizar `mem://features/db-schema` con las 2 tablas nuevas.
- Agregar a Core: "Kari registrado como feature `kari` en matriz; límite default paciente Gratuito = 5000 tokens/mes".

---

## Fuera de alcance

- Notificaciones push reales (solo banner + toast in-app).
- Exportación XLSX (solo CSV).
- Alertas por email al admin cuando margen baja (queda como siguiente iteración).

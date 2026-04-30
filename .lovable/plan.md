# Cierre Kari + Branding: validación y mejoras

Reviso lo que pediste contra lo que ya está construido y propongo solo lo que falta.

## Validación: qué ya existe vs qué falta

| Pedido | Estado | Acción |
|---|---|---|
| Listado de conversaciones de Kari | Listo en `/kari` | — |
| Reanudar chats | Listo (click selecciona) | — |
| **Búsqueda simple** en historial | **Falta** | Implementar |
| **Borrar chats** | **Falta** | Implementar |
| `consume_ai_tokens` por respuesta | Listo en edge `ai-kari-chat` | — |
| Error sin saldo | Listo (HTTP 402 + UI) | — |
| Pantalla de paquetes IA con Stripe | Listo en `/kari/tokens` | — |
| **Confirmación antes de pagar** | **Falta** (abre checkout directo) | Implementar |
| Mostrar balance en chat | Listo (badge en panel y `/kari`) | — |
| **Color de la barra inferior móvil** no coincide | **Falta** | Ajustar a marca |
| **Logo CareCentral más visual** en login y app | **Falta** | Aumentar y dar prominencia |

## 1. Búsqueda y borrado en historial de Kari (`/kari`)

- Añadir `<Input>` de búsqueda en el panel lateral izquierdo, filtra por título de conversación (`includes` case-insensitive sobre `useKariConversations`).
- Añadir botón papelera por fila en la lista de conversaciones con `AlertDialog` de confirmación.
- Nuevo hook `useDeleteKariConversation` que borra la fila de `ai_chat_conversations` (las RLS ya permiten `DELETE` al dueño y los mensajes se borran en cascada por FK… **verificar**: si no hay cascade, hacer borrado explícito de `ai_chat_messages` por `conversation_id` antes vía edge function `kari-delete-conversation` con service role).
- Si la conversación borrada es la activa → `newConversation()` para limpiar el panel.
- Skeleton/empty state cuando no hay coincidencias de búsqueda.

## 2. Diálogo de confirmación antes de pagar tokens

En `KariTokens.tsx`, intercalar un `Dialog` de confirmación entre el botón "Comprar" y la apertura del Embedded Checkout:

```text
[Comprar] → AlertDialog "¿Confirmar compra?"
   ├─ Resumen: pack, tokens, precio MXN
   ├─ Aviso: cargo único, tokens no caducan
   └─ [Cancelar] [Confirmar y pagar] → abre EmbeddedCheckout
```

Aplicar el mismo patrón en una sola tarjeta nueva de "balance + atajo" en el `KariChatPanel` cuando el saldo está bajo (<500 tokens), con CTA directo al store.

## 3. Branding: barra inferior móvil

La barra inferior actualmente es gris plano (`bg-background`). La rediseño para que case con la paleta CareCentral:

- Fondo glass con tinte navy: `bg-sidebar/95 backdrop-blur` + `border-t border-sidebar-border`.
- Texto inactivo: `text-sidebar-foreground/70`.
- Texto/ícono activo: `text-primary` (teal) con barra superior 2px en teal sobre el tab activo.
- Tab central de **Kari** destacado: círculo flotante teal-cyan gradient con el avatar de Kari, elevado -8px (estilo "FAB inline").
- Sombra superior sutil: `shadow-[0_-4px_20px_-8px_hsl(var(--primary)/0.15)]`.

## 4. Logo CareCentral más visual

**Login (`Login.tsx`)**: aumentar de `size={80}` a `size={120}` con `withText`, añadir ring teal sutil y leve animación `animate-in fade-in zoom-in-95` al cargar.

**Header desktop (`AppLayout.tsx`)**: subir de `size={28}` a `size={36}`, separación visual con divisor.

**Header móvil**: subir de `size={26}` a `size={34}`, centrar visualmente.

**Sidebar header**: añadir un nuevo `SidebarHeader` con el logo (versión solo ícono `size={32}`) + wordmark "CareCentral" en font-heading, fondo navy, separador inferior con accent-teal.

**Splash al entrar**: pequeño componente `BrandSplash` (200ms fade) con logo grande centrado que se muestra una sola vez por sesión al entrar a `/` desde el login (state en `sessionStorage`).

## Archivos a tocar

**Crear**
- `src/hooks/useKariConversationActions.ts` — delete conversación
- `src/components/kari/ConfirmPurchaseDialog.tsx` — confirmación de compra
- `src/components/brand/BrandSplash.tsx` — splash al entrar

**Editar**
- `src/pages/Kari.tsx` — input de búsqueda + botón eliminar por fila + AlertDialog
- `src/pages/KariTokens.tsx` — intercalar confirmación antes del checkout
- `src/components/BottomNav.tsx` — rediseño con paleta de marca y Kari como FAB inline
- `src/pages/Login.tsx` — logo más grande con ring + animación
- `src/components/AppLayout.tsx` — logos más grandes en headers; añadir `BrandSplash`
- `src/components/AppSidebar.tsx` — añadir `SidebarHeader` con logo+wordmark

**Migración**
- Verificar/añadir `ON DELETE CASCADE` de `ai_chat_messages.conversation_id → ai_chat_conversations.id`. Si no existe, agregar la FK con cascade (migración pequeña).

## Detalles técnicos

- Búsqueda: filtrado client-side sobre las 50 conversaciones ya cargadas — sin nuevas queries.
- Borrado: usa el cliente Supabase normal con la RLS existente `ai_chat_conv_owner_delete`. La cascada elimina los mensajes.
- Confirmación de compra: `AlertDialog` de shadcn — no abrir el `EmbeddedCheckoutProvider` hasta confirmar (evita pre-creación innecesaria de sesiones Stripe).
- Branding: todos los colores vía tokens HSL existentes (`--sidebar-*`, `--primary`, `--accent`). Ningún color hardcoded.
- Sin Stripe products nuevos. Sin nuevos secrets.

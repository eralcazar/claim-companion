

## Gestor de productos, inventario y suscripciones

Voy a construir 3 módulos nuevos en el panel admin/farmacia para que tengas control total del catálogo de la tienda, el stock y los planes de suscripción de la plataforma.

---

### 1. Gestor de productos de la tienda (mejorado)

Hoy `CatalogManager` es una lista simple. Lo reemplazo por una vista de administración completa:

- **Tabla con búsqueda, filtro por estado (activo/inactivo) y orden por nombre/precio/stock.**
- **Editor enriquecido** con: nombre, presentación, descripción larga, precio MXN, moneda, categoría, SKU, imagen (storage `pharmacy-products`), activo.
- **Botón "Sincronizar con cobros"**: si el producto no tiene `stripe_product_id`, llama a un edge function que crea el producto+precio en el proveedor de pagos y guarda los IDs. Si cambia el precio, archiva el price viejo y crea uno nuevo.
- **Acciones masivas**: activar/desactivar varios, exportar a CSV.

### 2. Módulo de inventario

Nueva tabla `pharmacy_inventory` (1 fila por producto) y `pharmacy_inventory_movements` (historial).

- Vista por producto con: **stock actual, stock mínimo, ubicación, costo unitario, último movimiento**.
- **Movimientos**: entrada (compra), salida (ajuste/merma), surtido (descuento automático cuando una orden pasa a `surtida`).
- **Alertas de stock bajo** en el dashboard de farmacia y notificación al rol `farmacia` cuando un producto baja del mínimo.
- **Validación en checkout**: si un producto está sin stock o desactivado no se puede agregar al carrito; si la orden ya fue creada y no hay stock al surtirla, se marca con badge "sin stock".
- Historial filtrable por fecha y tipo de movimiento, con exportación CSV.

### 3. Suscripciones a la plataforma + gestor de paquetes

Nuevas tablas:
- `subscription_plans` (paquete: nombre, descripción, precio mensual/anual, `stripe_product_id`, `stripe_price_id_mensual`, `stripe_price_id_anual`, activo, orden).
- `plan_features` (qué `feature_key` de `AVAILABLE_FEATURES` incluye cada plan, con límite opcional ej. "5 recetas/mes").
- `subscriptions` (user_id, plan_id, stripe_customer_id, stripe_subscription_id, status, `current_period_end`, `cancel_at_period_end`, environment).

**Gestor de paquetes (admin)** en `/admin/planes`:
- CRUD de planes con editor visual.
- **Selector de funciones del menú**: matriz tipo `PermissionMatrix` donde por cada plan marcás qué `feature_key` desbloquea (recetas, estudios, tendencias, agenda, etc.). Reutiliza el mismo array `AVAILABLE_FEATURES`.
- Botón "Publicar en cobros": crea/actualiza producto + precios mensual/anual en el proveedor.

**Página pública `/planes`** para que los usuarios vean los paquetes y se suscriban (checkout embebido reutilizando `pharmacy-create-checkout` adaptado a `mode: subscription`).

**Gating server-side y client-side**:
- Hook `useSubscription()` que devuelve plan activo + features incluidas.
- `usePermissions().can(feature)` extendido: además de rol, valida que el plan del usuario incluya esa feature (si la feature está marcada como "premium" en `plan_features`).
- Edge function `check-subscription-access` para validar en endpoints sensibles.
- Si no hay suscripción activa, se muestra prompt de upgrade en vez de la pantalla.

**Lógica de ciclo de vida** (ya acordada):
- Acceso inmediato al iniciar; mantener acceso hasta `current_period_end` si se cancela.
- Upgrade inmediato con prorrateo, downgrade al final del período (vía `proration_behavior` y `billing_cycle_anchor`).
- **Portal de cliente**: edge function `create-portal-session` para que el usuario gestione su suscripción/método de pago.

---

### Cambios técnicos

**Nuevas tablas (migration)**:
- `pharmacy_inventory(catalog_id PK, stock_actual, stock_minimo, ubicacion, costo_unitario_centavos, updated_at)`
- `pharmacy_inventory_movements(id, catalog_id, tipo enum [entrada/salida/surtido/ajuste], cantidad, motivo, order_id?, created_by, created_at)`
- `subscription_plans(id, nombre, descripcion, precio_mensual_centavos, precio_anual_centavos, stripe_product_id, stripe_price_id_mensual, stripe_price_id_anual, activo, orden, created_at)`
- `plan_features(id, plan_id FK, feature_key, limite_mensual?)`
- `subscriptions(id, user_id, plan_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end, environment, created_at, updated_at)`

**Columnas extra en `pharmacy_catalog`**: `categoria`, `sku`, `imagen_url`, `descripcion_larga`.

**RLS**:
- Inventario: lectura para `farmacia` y `admin`; escritura para `farmacia` y `admin`.
- `subscription_plans`: lectura pública autenticada; escritura solo `admin`.
- `subscriptions`: usuario ve su propia row; admin ve todas; webhook usa service role.

**Edge functions nuevas**:
- `sync-catalog-product` — crea/actualiza producto+price en pagos.
- `sync-subscription-plan` — crea/actualiza plan en pagos (mensual + anual).
- `subscription-create-checkout` — abre checkout embebido modo `subscription`.
- `create-portal-session` — abre portal de gestión.
- Extender `payments-webhook` para manejar `customer.subscription.created/updated/deleted` e `invoice.paid` → upsert en `subscriptions` y descontar inventario al marcar orden surtida.

**Frontend nuevo**:
- `src/pages/admin/ProductManager.tsx` (reemplaza CatalogManager actual con tabla rica)
- `src/pages/admin/InventoryManager.tsx` (+ widget de stock bajo en `PharmacyPanel`)
- `src/pages/admin/PlanManager.tsx` con `PlanFeaturesMatrix.tsx`
- `src/pages/Plans.tsx` (página pública de planes)
- `src/pages/Subscription.tsx` (estado de suscripción del usuario + botón portal)
- Hooks: `useInventory`, `useInventoryMovements`, `usePlans`, `useSubscription`
- 3 nuevas `feature_key` en `features.ts`: `product_manager`, `inventory_manager`, `plan_manager`, agregadas a `AppSidebar` grupo admin/farmacia.

**Productos sembrados**: los planes se crean vacíos para que vos los definás desde la UI (no hardcodeo precios en el código). Cuando los crees, el botón "Publicar en cobros" los sincroniza.

---

### Lo que NO hago en esta fase
- No migro las suscripciones existentes (no hay).
- No agrego email transaccional (queda pendiente como ya acordamos).
- No agrego pasarelas adicionales más allá de la integrada.


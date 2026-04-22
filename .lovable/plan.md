

## Arreglar "Productos tienda"

Detecté varios bugs en el módulo recién creado. Voy a corregirlos todos en una sola pasada.

### Problemas encontrados

1. **Editar producto falla**: al hacer click en "Editar", el objeto `editing` arrastra `created_at`, `updated_at`, `stripe_product_id`, `stripe_price_id` y se mandan en el `update`. Postgres tira error porque trata de sobreescribir timestamps protegidos por trigger y el cliente envía objetos no esperados.
2. **Tipo `CatalogItem` incompleto**: no incluye `categoria`, `sku`, `descripcion_larga`, `imagen_url`, `stripe_product_id`, `stripe_price_id`. Esto provoca que TypeScript pierda los campos y la UI use `as any` por todos lados.
3. **SKU vacío genera conflicto**: si guardás dos productos con `sku=""`, viola futuro unique. Hay que convertir `""` → `null` antes de insertar.
4. **`useUpsertCatalog` no espera retorno**: el insert no devuelve la fila creada, así que el dialog cierra sin que el editor sepa el id nuevo.
5. **Sync con cobros falla silencioso**: la edge function `sync-catalog-product` espera `catalog_id` pero si el producto se acaba de crear con campos vacíos (sin precio>0), Stripe rechaza. Hay que bloquear el botón Sync cuando `precio_centavos === 0`.
6. **Validación de guardado**: hoy se permite guardar `precio_centavos = 0` o nombre vacío sin feedback. Agrego validación visible.

### Cambios concretos

**`src/hooks/usePharmacy.ts`**
- Extender `CatalogItem` con todos los campos reales de la tabla (`categoria`, `sku`, `descripcion_larga`, `imagen_url`, `stripe_product_id`, `stripe_price_id`).
- En `useUpsertCatalog`: limpiar payload antes de mandar — quitar `created_at`, `updated_at`, `id` (en update va por separado). Convertir `sku === ""` a `null`. Hacer `.select().single()` en insert para retornar el id nuevo.
- Mejor manejo de error: mostrar el `error.message` real en el toast.

**`src/pages/admin/ProductManager.tsx`**
- Validar antes de guardar: nombre obligatorio, `precio_centavos > 0`. Mostrar toast de error.
- Bloquear botón "Sync" si el producto no tiene precio o no está activo.
- Después de crear un producto nuevo, ofrecer botón "Sincronizar ahora" en el toast de éxito.
- Quitar todos los `as any` reemplazándolos con el tipo extendido.
- Refrescar la lista (`invalidate`) después de Sync para actualizar el badge "Sincronizado".

**`supabase/functions/sync-catalog-product/index.ts`**
- Validar que `precio_centavos > 0` antes de llamar a Stripe; devolver 400 con mensaje claro si no.
- Devolver el detalle del error de Stripe en el `JSON` para que el toast del frontend lo muestre.

### Lo que NO cambia
- Esquema de DB (las columnas ya existen).
- RLS (ya permite admin/farmacia).
- Productos sembrados (Paracetamol e Ibuprofeno siguen ahí).


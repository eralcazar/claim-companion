# Unificar paquetes Kari en "Planes y paquetes" + selector de modelo IA

## Qué se va a construir

### 1. Nuevo tab "Paquetes Kari (IA)" en `/admin/planes`
La página `PlanManager.tsx` hoy tiene 2 tabs (**Suscripciones** y **Paquetes OCR**). Se agrega un tercer tab **Paquetes Kari** con la misma estética y patrón:

- Tabla con: Nombre · Tokens · Precio · Estado · Acciones (editar/borrar/sincronizar con cobros)
- Botón "Nuevo paquete Kari"
- Diálogo de edición con: nombre, descripción, tokens, precio (MXN), orden, activo
- Botón "Sync" por fila para publicar el paquete en cobros (Stripe), igual que los OCR

### 2. Hook nuevo `useAiTokenPacksAdmin` (paralelo a `useOcrPacks`)
- `useAiTokenPacks({ onlyActive })` — listar
- `useUpsertAiTokenPack` — crear/editar
- `useDeleteAiTokenPack` — borrar
- `useSyncAiTokenPack` — invocar edge function `sync-ai-token-pack` para publicar en cobros

La tabla `ai_token_packs` **ya existe** con todas las columnas necesarias (incluye `stripe_product_id` y `stripe_price_id`), no se requiere migración de schema.

### 3. Edge function `sync-ai-token-pack` (nueva)
Análoga a `sync-ocr-pack`: crea/actualiza producto + precio one-time en Stripe y guarda los IDs en `ai_token_packs`. Usa `createStripeClient(env)` del shared util.

### 4. Selector de modelo IA de Kari (admin-only)
- Nueva tabla mínima `ai_settings` (key/value singleton) o columna en `ai_token_monthly_limits`. Más limpio: tabla nueva `ai_settings` con un solo row.
- Card en `/admin/kari-uso` (KariUsageAdmin.tsx) titulada **"Modelo de IA activo"** con un `<Select>` que permite elegir entre:
  - `google/gemini-2.5-flash-lite` — Económico
  - `google/gemini-3-flash-preview` — Recomendado (actual)
  - `google/gemini-2.5-flash` — Estable
  - `google/gemini-2.5-pro` — Premium (40× más caro)
- Muestra al lado el costo µUSD/token input y output del modelo seleccionado.
- La edge function `ai-kari-chat` lee `ACTIVE_MODEL` desde `ai_settings` (con fallback al hardcoded actual si la tabla está vacía).

### 5. Card de "Margen" en `/admin/kari-uso`
Se enriquece el resumen existente con un cálculo de utilidad real:
- **Ingresos del periodo** (de `ai_token_purchases` ya existente)
- **Costo IA real** (de `ai_token_usage_log.cost_usd_micros` ya existente)
- **Margen bruto $** y **Margen %**

Ya tienes los datos crudos — solo falta exponerlos.

### 6. Limpieza
- Quitar el link "Tokens Kari" del menú admin si era una página separada de gestión (no la del usuario `/kari/tokens` que es para comprar). Verificar que no exista una página huérfana.

## Detalles técnicos

**Archivos a crear:**
- `src/hooks/useAiTokenPacks.ts` — CRUD + sync hooks
- `supabase/functions/sync-ai-token-pack/index.ts` — Stripe upsert para paquetes Kari

**Archivos a modificar:**
- `src/pages/admin/PlanManager.tsx` — agregar tab "Paquetes Kari" replicando la estructura del tab OCR
- `src/pages/admin/KariUsageAdmin.tsx` — agregar card "Modelo de IA activo" + card "Margen"
- `supabase/functions/ai-kari-chat/index.ts` — leer modelo desde `ai_settings` en vez de constante hardcoded
- `supabase/config.toml` — registrar nueva función si requiere config

**Migración SQL:**
```sql
create table public.ai_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
alter table public.ai_settings enable row level security;
create policy "admin manage ai_settings" on public.ai_settings
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));
create policy "anyone read ai_settings" on public.ai_settings
  for select to authenticated using (true);
insert into public.ai_settings(key,value) values
  ('kari_active_model','"google/gemini-3-flash-preview"'::jsonb);
```

## Lo que NO se cambia

- **No se modifica el modelo activo automáticamente.** Sigue `gemini-3-flash-preview`. Tú decides cuándo cambiarlo desde el nuevo selector.
- **No se cambian los precios de los 3 paquetes existentes** (Mini/Plus/Pro). Solo se agrega la UI para administrarlos.
- **No se toca** la lógica de descuento de tokens ni de límite mensual — siguen funcionando igual.

## Resultado esperado

- Admin entra a **/admin/planes** y ve 3 tabs: Suscripciones · Paquetes OCR · **Paquetes Kari** — todo en un solo lugar.
- Admin entra a **/admin/kari-uso** y puede cambiar el modelo de IA con un dropdown, y ver utilidad neta del periodo.
- Cero scripts SQL manuales para gestionar paquetes Kari.

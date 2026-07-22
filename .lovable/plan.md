
## Contexto verificado

- **Usuario destino confirmado**: `eralcazr@gmail.com` existe en `profiles` con `user_id = 5cc3060c-441a-4c46-ac6d-98f44d557862`.
- **Infra ya existente**:
  - Tabla `ai_token_balances` (balance, lifetime_granted, lifetime_consumed).
  - Tabla `ai_token_usage_log` (por request: model, prompt/completion/total tokens, `cost_usd_micros`, provider, fallback_used).
  - Edge function `admin-grant-ai-tokens` + RPC `add_ai_tokens` → ya listo para acreditar.
  - Panel `/admin/kari-usage` con resumen, tabla por usuario, gráfica diaria (usa RPCs `get_kari_usage_summary/by_user/daily`).
- **Limitación importante**: la Lovable AI Gateway solo expone `X-Lovable-AIG-Run-ID` y `X-Lovable-AIG-Log-ID` en headers de respuesta; **no expone el costo/créditos reales**. El costo/créditos "reales" de Lovable solo se ven en Workspace → Usage. Por eso el dashboard hará dos capas:
  1. **Costo estimado in-app** (calculado por tarifa por token del modelo — lo que ya calcula `cost_usd_micros`).
  2. **Costo real Lovable** cargado manualmente vía importador CSV del export de Workspace → Usage, correlacionado por `run_id`/`log_id`.

## Alcance

### 1. Acreditar tokens al usuario `eralcazr@gmail.com`
- Insertar/actualizar `ai_token_balances` para `user_id 5cc3060c-441a-4c46-ac6d-98f44d557862` con **balance inicial de 500,000 tokens** (suficiente para probar todos los asistentes varias veces).
- Registrar la operación en `ai_token_purchases` con `status='granted'` y `environment='manual'` para trazabilidad.

### 2. Capturar identificadores de Lovable Gateway (para poder cruzar con el real)
- Migración: agregar a `ai_token_usage_log` las columnas
  - `gateway_run_id text`
  - `gateway_log_id text`
  - `gateway_credits numeric(12,6)` (llenado por el importador CSV)
  - `gateway_cost_cents integer` (llenado por el importador CSV)
  - Índices por `gateway_log_id` y `gateway_run_id`.
- Modificar `supabase/functions/_shared/ai-router.ts` para leer los headers `X-Lovable-AIG-Run-ID` y `X-Lovable-AIG-Log-ID` de la respuesta del gateway y persistirlos junto con la fila que ya inserta en `ai_token_usage_log`.

### 3. Importador de consumo real de Lovable
- Nuevo componente `LovableUsageImporter.tsx` dentro de `KariUsageAdmin`:
  - Subida de CSV exportado desde Workspace → Usage (Lovable).
  - Parseo con `papaparse` (ya presente en el proyecto).
  - Match por `log_id`/`run_id` contra `ai_token_usage_log` y update de `gateway_credits` + `gateway_cost_cents`.
  - Reporte visual de "matcheados" vs "no matcheados".

### 4. Dashboard comparativo (extender `/admin/kari-usage`)

Nueva pestaña **"Comparativa in-app vs Lovable real"** con:
- **KPIs lado a lado**:
  - Tokens consumidos (in-app) · Costo estimado (USD / MXN)
  - Créditos Lovable reales · Costo real (USD / MXN)
  - Delta y % de desviación
- **Tabla por modelo** (`google/gemini-*`, `openai/gpt-*`, etc.):
  - Requests · Tokens · Costo estimado · Créditos reales · Costo real · Δ%
- **Tabla por feature/asistente** (Kari, activity coach, exercise coach, nutrition suggest, glossary, recipe adapt, workout plan, extract-study-indicators, OCR): agrupada por `feature`/función invocada — usar el `feature` que ya viaja en `ai_provider_audit` o inferir por `conversation_id` cuando aplique.
- **Filtro por usuario** (email/nombre) para aislar a `eralcazr@gmail.com` en las pruebas.
- **Gráfica dual** (recharts): línea "costo estimado por día" vs "costo real por día".

### 5. Panel "Probar consumo" (launchpad de pruebas)

Nueva sección `AssistantTestLauncher.tsx` en el mismo dashboard, restringida a admin:
- Selector de usuario objetivo (default: `eralcazr@gmail.com`).
- Botones por asistente con prompt canónico predefinido, invocan las edge functions vía `supabase.functions.invoke` **impersonando al usuario destino** (usa `admin-users` o service-role token dedicado):
  - Kari chat (`ai-kari-chat`)
  - Coach de actividad (`ai-activity-coach`)
  - Coach de ejercicios (`ai-exercise-coach`)
  - Sugerencias nutricionales (`ai-nutrition-suggest`)
  - Adaptar receta (`ai-recipe-adapt`)
  - Glosario (`ai-glossary`)
  - Generar plan de entrenamiento (`ai-workout-plan-generate`)
  - Ajustar plan (`ai-workout-plan-adjust`)
  - Extraer indicadores de estudio (`extract-study-indicators`)
- Cada botón muestra respuesta cruda + tokens consumidos + `log_id` devuelto en headers, para verificar cobro inmediato.

## Detalles técnicos

- **Migración SQL** (columnas nuevas + índices) — no toca RLS existente.
- **Grant de tokens**: usar tool `supabase--insert` (upsert en `ai_token_balances` + insert en `ai_token_purchases`).
- **Router edge**: cambio no-disruptivo (solo agrega captura de headers).
- **Frontend**: 3 componentes nuevos en `src/components/admin/`:
  - `UsageComparisonPanel.tsx`
  - `LovableUsageImporter.tsx`
  - `AssistantTestLauncher.tsx`
- **Hook nuevo**: `useKariUsageComparison(from, to, userId?)` que hace RPC nuevo `get_kari_usage_comparison` (por modelo, por feature, por día — devuelve estimado + real cuando hay match).
- **Tipo de cambio**: parámetro global editable (actualmente hardcoded ~17–18.5). Se moverá a input controlado dentro del panel para la conversión USD→MXN.

## Fuera de alcance

- Auto-sync programado del CSV de Lovable (por ahora es upload manual — la Gateway no expone API pública de costos).
- Cambios en la lógica de cobro/consumo del router (solo se agregan campos de trazabilidad).

## Entregable de pruebas

1. Login como admin → `/admin/kari-usage` → sub-pestaña "Comparativa".
2. Seleccionar usuario `eralcazr@gmail.com`.
3. En "Probar consumo" disparar cada asistente.
4. Ver la fila crecer en la tabla por modelo/feature (columna estimada).
5. Exportar CSV desde Workspace → Usage de Lovable, importarlo en "Importar consumo real Lovable".
6. Ver la columna "real" y el delta % actualizarse.

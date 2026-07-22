# Plan — Monitores con alertas + Nutrición con IA y recetas MedlinePlus

## 1) Alertas y estado de sincronización en monitores

Alcance: `SleepMonitor`, `StepsMonitor`, `HeartRateMonitor` (más adelante el resto reutiliza el hook).

- **Hook nuevo `useMonitorHealth(source, series, dateRange)`** que devuelve:
  - `lastReadingAt`, `syncStatus` ("ok" | "stale" | "empty" | "syncing")
  - `alerts[]`: gaps > 2 días, valores atípicos (z-score |z| > 2.5 sobre la media móvil de 14 días) y días con sólo un origen manual cuando debería haber wearable.
  - `explanations`: texto corto ("posible dispositivo desconectado", "rango de fechas no cubre datos", etc.) + pasos accionables.
- **Componente `MonitorAlertsCard`** con acordeón por alerta (severidad, motivo, pasos: revisar rango de fechas, verificar dispositivo, reintentar sync).
- **Componente `SyncStatusPill`** reutilizable (última lectura formateada, badge de estado, botón "Reintentar" que llama `sync-health-data` — ya existe — y refresca la query).
- Integrar ambos en la parte superior de cada uno de los 3 monitores mencionados (sin tocar el gráfico ni el PDF).

## 2) Nutrición: macros automáticos por ingredientes

- **Tabla `nutrition_ingredients_catalog`** semilla (~80 alimentos base MX) con `name`, `kcal_100g`, `carbs_g`, `protein_g`, `fat_g`, `fiber_g`, `is_public`.
- **Migración `recetas_nutricion`**: nueva tabla `nutrition_recipes` con `title`, `ingredients` (jsonb: `[{name, grams, ingredient_id?}]`), `steps`, `servings`, `total_kcal`, `total_carbs_g`, `total_protein_g`, `total_fat_g`, `source_type` (**obligatorio**: `nutriologa` | `medlineplus` | `web` | `libro` | `manual_paciente`), `source_url`, `source_author`, `notes`, RLS por dueño + lectura para nutriólogo asignado.
- **Cálculo cliente en vivo**: `computeMacros(ingredients, catalog)` en `src/lib/nutrition/macros.ts`. Se recalcula al vuelo mientras el usuario edita.
- **Componente `RecipeEditor`** con:
  - selector con búsqueda del catálogo + gramos por ingrediente,
  - contador de macros en tarjeta lateral (kcal/carbs/prot/grasa por porción),
  - selector de **Origen** requerido (Zod, no permite guardar sin origen; `nutriologa` pide nombre, `web/medlineplus` pide URL).

## 3) Import MedlinePlus (ES)

- **Edge function `medlineplus-recipe-import`** (JWT verificado):
  - Recibe `{ url }` de `medlineplus.gov/spanish/recetas/...`.
  - Descarga vía `fetch` con `User-Agent`; parsea HTML con regex acotadas para título, "Acerca de", ingredientes (lista `<ul>` tras "Ingredientes"), instrucciones y "Origen"/"Fuente".
  - Cita cumplimiento: guarda `source_url`, `source_author = "MedlinePlus (NIH)"` y `attribution` con link a `/spanish/acercade/usodecontenido/`.
  - Devuelve un draft; el usuario confirma en `RecipeEditor` (donde se corren los macros con el catálogo).
- **Botón "Importar de MedlinePlus"** en Nutrición → Recetas.
- Rate limit simple (1 req cada 3s por usuario) y validación de dominio (solo `medlineplus.gov/spanish/recetas/`).

## 4) Sugerencias IA con `AiAnswer` en Nutrición

- **Sección "Pregunta al Coach de Nutrición"** dentro de `Nutricion.tsx`:
  - Input + botón que llama `ai-nutrition-suggest` (ya existe) enviando `feature_key: 'nutrition_suggestions'` para respetar `ai_provider_policy`.
  - Renderiza con `<AiAnswer text={data.text} references={data.references} />` (formato ya soportado).
  - Si el feature está desactivado en políticas, muestra `AiProviderStatusBanner` con la causa.

## 5) Reindex masivo del KB desde /admin/conocimiento

- **Botón "Reindexar todo"** en `KnowledgeBase.tsx`:
  - Query IDs de `knowledge_documents WHERE status='approved'`.
  - Progreso visible (barra + contador X/Y) llamando `knowledge-embed` por lotes de 5 con `Promise.allSettled` y backoff en 429.
  - Log de fallos (título + motivo) descargable como CSV.
- **Botón "Reindexar sólo seed"** filtrando por `source='seed'`.
- No cambia `knowledge-embed`, sólo lo orquesta el frontend admin.

## 6) Recetas manuales con origen obligatorio

Cubierto en el punto 2 (`RecipeEditor` + `source_type` NOT NULL + validación Zod en cliente y CHECK en DB). Se agrega también en la lista de recetas un badge visible por origen y filtro rápido.

## Detalles técnicos

- IA: sigue `ai-router.ts` y no cambia el contrato de `AiAnswer` (texto + `references[]`).
- DB: nuevas tablas con GRANTs para `authenticated` + `service_role`, RLS scoped a `patient_id = auth.uid()` con excepción para nutriólogo vía `patient_personnel`.
- MedlinePlus: se guarda `attribution` textual porque es de dominio público del NIH; se muestra en el detalle de la receta.
- Reindex: se hace desde el navegador del admin usando la sesión existente; sin nuevos secretos.

## Archivos que se crean

- `src/hooks/useMonitorHealth.ts`
- `src/components/health/MonitorAlertsCard.tsx`
- `src/components/health/SyncStatusPill.tsx`
- `src/lib/nutrition/macros.ts`
- `src/components/nutricion/RecipeEditor.tsx`
- `src/components/nutricion/RecipesList.tsx`
- `src/components/nutricion/NutritionAiPanel.tsx`
- `src/components/admin/KnowledgeReindexPanel.tsx`
- `supabase/functions/medlineplus-recipe-import/index.ts`
- Migración: `nutrition_ingredients_catalog`, `nutrition_recipes` (+seed catálogo).

## Archivos que se modifican

- `src/pages/SleepMonitor.tsx`, `src/pages/StepsMonitor.tsx`, `src/pages/HeartRateMonitor.tsx` (insertar `SyncStatusPill` + `MonitorAlertsCard`).
- `src/pages/Nutricion.tsx` (tabs: Recetas + Coach IA + import MedlinePlus).
- `src/pages/admin/KnowledgeBase.tsx` (montar `KnowledgeReindexPanel`).

## Fuera de alcance

- No se toca el módulo de Ejercicios ni los PDFs existentes.
- No se cambian políticas ni el catálogo de proveedores IA.
- No se agrega scraping masivo (solo por URL individual, on-demand).

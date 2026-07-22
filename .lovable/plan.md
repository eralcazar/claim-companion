## Objetivo

1. Registrar **nutrición y recetas** en `ai_provider_policy` como features seleccionables desde `/admin/ai-policies`.
2. Que **toda respuesta de IA** devuelva y renderice **referencias/citas** cuando existan.
3. Base de **conocimiento global** consultable por cualquier usuario, con RAG en los endpoints.
4. **Traducción automática** de contenido al español.
5. **Edición colaborativa en tiempo real** con bloqueo por `status`.
6. **Ingesta masiva** desde MedlinePlus, PubMed y UpToDate.
7. **Rerank con modelo aparte** (además de similitud coseno).

---

## Parte 1 — Políticas IA para Nutrición y Recetas

- Agregar en `AI_FEATURES` (`src/hooks/useAiGovernance.ts`): `nutrition_suggestions`, `recipe_adapt`.
- Migración: insertar filas en `ai_provider_policy` (default `lovable` / `google/gemini-3-flash-preview`, cache 24h).
- Nuevos edge functions `ai-nutrition-suggest` y `ai-recipe-adapt` enrutados por `_shared/ai-router.ts` con consentimiento, PII sanitization, circuit breaker y audit.
- UI: `NutritionCoachCard` en `Nutricion.tsx` y botón "Adaptar con IA" en `RecetaDetailDialog`.

## Parte 2 — Referencias/citas uniformes

- Contrato de salida `{ text, references[] }` con `{id, title, source, url?, snippet?, section?}`.
- `_shared/ai-router.ts`: `Output.object` con `references` cuando `supports_references=true`, normalización de `[[ref:id]]` → `[n]`, auditoría en `ai_provider_audit` (`references_count`, `references_ids`).
- Componente `src/components/ai/AiAnswer.tsx` con markdown + sección "Fuentes" clicable (interno abre `KnowledgeDocumentSheet`, externo abre URL). Integrado en Kari, ExerciseCoach, ActivityCoach, NutritionCoach, GlosarioDialog, RecetaDetailDialog.

## Parte 3 — Base de conocimiento global (RAG)

### Modelo de datos (migración con GRANT + RLS)
- `knowledge_documents` — `id, title, slug, category, body_md, body_md_original, source_language, summary, tags[], source, source_url, source_attribution, language='es', is_public, status (draft|review|published|retired), version int, created_by, reviewed_by, published_at, timestamps`.
- `knowledge_chunks` — `document_id, chunk_index, content, token_count, embedding vector(1536)` con índice HNSW cosine.
- `knowledge_curation_log` — auditoría de cambios/aprobaciones.
- `knowledge_locks` — bloqueo activo: `document_id pk, locked_by, locked_at, expires_at, section` para edición cooperativa (Parte 5).
- `knowledge_translations_queue` — pendientes de traducción con estado.
- `knowledge_ingest_jobs` — trabajos de ingesta masiva (`source`, `status`, `stats jsonb`, `error`).
- Extensión `pgvector`; función `public.match_knowledge(query_embedding, match_count, min_similarity, categories[])` que devuelve top-K.

### Endpoints
- `knowledge-embed` — chunkea (~800 tokens overlap 100) y embebe con `/v1/embeddings` (`openai/text-embedding-3-small`, `dimensions:1536`).
- `knowledge-search` — embebe query, corre `match_knowledge`, luego **rerank** (Parte 7), devuelve top-K final.
- Helper `retrieveContext(prompt, feature)` en `_shared/ai-router.ts` que inyecta bloque "Fuentes disponibles" con IDs a citar.
- Columnas nuevas en `ai_provider_policy`: `rag_enabled bool`, `rag_categories text[]`, `supports_references bool`.

### UI
- `/admin/knowledge` (curación) y `/conocimiento` (búsqueda pública) con `KnowledgeDocumentSheet.tsx`.
- Seeds iniciales (~30 documentos base) en la migración.

## Parte 4 — Traducción automática al español

- Edge function `knowledge-translate`: recibe `document_id`, lee `body_md_original` + `source_language`, llama a Lovable AI (`google/gemini-3-flash-preview`) con prompt "Traduce a español clínico neutro conservando terminología médica, unidades e hipervínculos" y `Output.object({ title, summary, body_md, terminology_notes })`.
- Guarda resultado en `knowledge_documents` (`body_md`, `title`, `summary`, `language='es'`) y deja `body_md_original` intacto para auditoría/re-traducción.
- Trigger AFTER INSERT/UPDATE en `knowledge_documents` cuando `source_language <> 'es'` y `status in ('draft','review')` encola en `knowledge_translations_queue` (vía `pg_net` a `knowledge-translate`).
- Job programado `translate-pending-knowledge-cron` (cada 5 min via `pg_cron`) drena la cola con backoff y respeta circuit breaker.
- UI en `/admin/knowledge`: badge "Traducido por IA" con enlace al original y botón "Re-traducir".

## Parte 5 — Edición colaborativa en tiempo real

- Habilitar Realtime en `knowledge_documents`, `knowledge_locks`, `knowledge_curation_log` (`ALTER PUBLICATION supabase_realtime ADD TABLE …`).
- Reglas de bloqueo:
  - `status='published'` o `retired` → lectura sólo; edición bloqueada salvo admin que primero mueva a `draft`.
  - `status in ('draft','review')` → editable, protegido por `knowledge_locks`.
- Flujo: al abrir el editor, RPC `acquire_knowledge_lock(document_id, section?)` inserta/renueva fila con `expires_at = now()+5 min`. Heartbeat cada 60s renueva; `release_knowledge_lock` al cerrar. Locks vencidos se ignoran.
- Nuevo hook `useKnowledgeEditor(documentId)`:
  - Suscripción `postgres_changes` a `knowledge_documents:id=eq.<id>` y a `knowledge_locks:document_id=eq.<id>` (dentro de `useEffect`, con `removeChannel` en cleanup).
  - Presencia `channel.track({user_id, name, section, cursor})` para mostrar quién está viendo/editando.
  - Merge optimista: si llega un `UPDATE` externo y el usuario tiene cambios locales, muestra banner "El documento cambió — revisar diferencias" y ofrece rebase manual (no CRDT en esta iteración).
- UI: badge de estado, chips con avatares de otros editores, indicador "Bloqueado por Dra. X — expira en 2:31", botón "Tomar control" (sólo admin).
- Cambios de `status` (`draft → review → published`) requieren rol `admin` o `curador` y disparan re-embed automático.

## Parte 6 — Ingesta masiva (MedlinePlus + PubMed + UpToDate)

Cada fuente registra su trabajo en `knowledge_ingest_jobs` y sus documentos con `source_attribution` obligatorio.

### 6.1 MedlinePlus (español)
- Edge functions `import-medlineplus-recipe` y `sync-medlineplus-index` (URL individual + recorrido del índice de recetas y de temas de salud en `/spanish/`).
- Restringido a dominio `medlineplus.gov`. Deduplicación por `slug`/`source_url`. Categorías: `receta`, `medicamento`, `estudio`, `guia_clinica`.

### 6.2 PubMed
- Edge function `import-pubmed`:
  - `POST { query, retmax<=200, mindate?, maxdate? }`.
  - Usa E-utilities NCBI (`esearch.fcgi` + `efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml`) con `tool=CareCentral&email=<config>`; API key opcional vía secret `PUBMED_API_KEY` para 10 req/s (si no está, throttling a 3 req/s).
  - Parsea XML (título, abstract, autores, journal, año, DOI, MeSH terms, PMID) y guarda como `source='pubmed'`, `source_url=https://pubmed.ncbi.nlm.nih.gov/<pmid>/`, `source_language='en'` → dispara Parte 4 para traducir.
  - Categoría por MeSH heurístico (`Pharmaceutical Preparations` → medicamento, `Diagnosis` → estudio/análisis, etc.), reasignable en curación.
  - Filtro por licencia: sólo abstract (dominio público en PubMed), no full text; queda `status='review'` obligatoriamente.
- UI en `/admin/knowledge/ingesta` con formulario de query, vista previa, botón "Importar seleccionados".

### 6.3 UpToDate
- Edge function `import-uptodate` con dos modos:
  - **API oficial** si el hospital/cliente tiene licencia enterprise: secret `UPTODATE_API_KEY` + endpoint configurable; se guarda contenido completo con `source='uptodate'` y `source_attribution` requerido por Wolters Kluwer.
  - **Sin licencia**: sólo se guarda **metadatos + enlace canónico** (title, topic id, url, snippet corto ≤200 chars) marcado `is_public=false, status='review'` para uso interno de curadores; nunca se publica full text ni se sirve por `knowledge-search` público.
- Warning legal explícito en la UI de admin y en el registro de auditoría.

### 6.4 Orquestación
- `knowledge_ingest_jobs` con progreso y errores; UI en tiempo real via Realtime.
- Todas las importaciones marcan documentos como `status='review'` para pasar por curación humana antes de publicarse.
- Post-ingesta encola: traducción (Parte 4) → embedding (`knowledge-embed`) → notificación al curador.

## Parte 7 — Rerank con modelo aparte

- Edge function `knowledge-rerank`:
  - Input: `{ query, candidates: [{id, title, snippet}] }` (top-30 de la búsqueda coseno).
  - Llama a Lovable AI (`google/gemini-3-flash-preview`) con `Output.object({ ranked: [{id, score:0..1, reason}] })` y prompt de rerank clínico ("Ordena por relevancia clínica y prioriza fuentes primarias/guías sobre resúmenes").
  - Devuelve top-K (default 6) fusionado con el score coseno (`final = 0.6*rerank + 0.4*cosine`).
- Integrado en `knowledge-search` y en `retrieveContext`: la búsqueda ahora es dos etapas (recall coseno amplio → rerank).
- Configurable por feature: nueva columna en `ai_provider_policy` `rerank_enabled bool default true`, `rerank_top_n int default 30`, `rerank_keep int default 6`.
- Cacheado por `(query_hash, feature)` durante 6h en `ai_response_cache` para reducir costo.
- Auditado en `ai_provider_audit` (`rerank_used`, `rerank_latency_ms`).

---

## Notas técnicas
- Todas las tablas nuevas: `CREATE TABLE` → `GRANT` (`authenticated` + `anon` sólo lectura pública; `service_role` all) → `ENABLE RLS` → policies (curadores por `has_role('admin')` o `has_role('curador')`; lectura pública sólo `is_public AND status='published'`).
- Realtime activado explícitamente por tabla y con RLS aplicada.
- Secrets nuevos a solicitar cuando toque construir cada pieza: `PUBMED_API_KEY` (opcional), `UPTODATE_API_KEY` (opcional). MedlinePlus no requiere key.
- Traducción, rerank y RAG comparten `_shared/ai-router.ts` y respetan kill switch, consentimiento y cache.
- Cronjobs (`pg_cron` + `pg_net`): traducción pendiente cada 5 min, ingesta programada opcional (diaria) por fuente.

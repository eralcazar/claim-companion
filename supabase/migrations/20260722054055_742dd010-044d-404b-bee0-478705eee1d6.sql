
-- ============================================================
-- Extensiones
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1) Nuevas columnas en ai_provider_policy y ai_provider_audit
-- ============================================================
ALTER TABLE public.ai_provider_policy
  ADD COLUMN IF NOT EXISTS supports_references boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rag_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rag_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rerank_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rerank_top_n integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS rerank_keep integer NOT NULL DEFAULT 6;

ALTER TABLE public.ai_provider_audit
  ADD COLUMN IF NOT EXISTS references_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS references_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rerank_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rerank_latency_ms integer;

-- ============================================================
-- 2) knowledge_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text NOT NULL CHECK (category IN ('medicamento','estudio','analisis','receta','guia_clinica','glosario','otro')),
  summary text,
  body_md text NOT NULL DEFAULT '',
  body_md_original text,
  source_language text NOT NULL DEFAULT 'es',
  language text NOT NULL DEFAULT 'es',
  tags text[] NOT NULL DEFAULT '{}',
  source text NOT NULL DEFAULT 'internal' CHECK (source IN ('medlineplus','pubmed','uptodate','internal','manual','imported','other')),
  source_url text,
  source_attribution text,
  is_public boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','retired')),
  version integer NOT NULL DEFAULT 1,
  translated_by_ai boolean NOT NULL DEFAULT false,
  translated_at timestamptz,
  created_by uuid,
  reviewed_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.knowledge_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_documents TO authenticated;
GRANT ALL ON public.knowledge_documents TO service_role;

ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read published"
  ON public.knowledge_documents FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND status = 'published');

CREATE POLICY "curators can read all"
  ON public.knowledge_documents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "curators can insert"
  ON public.knowledge_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "curators can update"
  ON public.knowledge_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "curators can delete"
  ON public.knowledge_documents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS knowledge_documents_status_idx ON public.knowledge_documents(status, is_public);
CREATE INDEX IF NOT EXISTS knowledge_documents_category_idx ON public.knowledge_documents(category);
CREATE INDEX IF NOT EXISTS knowledge_documents_source_url_idx ON public.knowledge_documents(source_url);
CREATE INDEX IF NOT EXISTS knowledge_documents_tags_idx ON public.knowledge_documents USING gin(tags);

CREATE TRIGGER trg_knowledge_documents_updated_at
  BEFORE UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) knowledge_chunks (con embeddings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_count integer,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

GRANT SELECT ON public.knowledge_chunks TO anon, authenticated;
GRANT ALL ON public.knowledge_chunks TO service_role;

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read chunks of published docs"
  ON public.knowledge_chunks FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.knowledge_documents d
    WHERE d.id = document_id AND d.is_public = true AND d.status = 'published'
  ));

CREATE POLICY "admins full chunks access"
  ON public.knowledge_chunks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS knowledge_chunks_document_idx ON public.knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON public.knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- 4) knowledge_curation_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_curation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  from_status text,
  to_status text,
  notes text,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.knowledge_curation_log TO authenticated;
GRANT ALL ON public.knowledge_curation_log TO service_role;

ALTER TABLE public.knowledge_curation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read curation log"
  ON public.knowledge_curation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins insert curation log"
  ON public.knowledge_curation_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS knowledge_curation_log_doc_idx ON public.knowledge_curation_log(document_id, created_at DESC);

-- ============================================================
-- 5) knowledge_locks (edición colaborativa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_locks (
  document_id uuid PRIMARY KEY REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  locked_by uuid NOT NULL,
  locked_by_name text,
  section text,
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes'
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_locks TO authenticated;
GRANT ALL ON public.knowledge_locks TO service_role;

ALTER TABLE public.knowledge_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read locks"
  ON public.knowledge_locks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin manage locks"
  ON public.knowledge_locks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR locked_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR locked_by = auth.uid());

CREATE OR REPLACE FUNCTION public.acquire_knowledge_lock(_document_id uuid, _section text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_existing public.knowledge_locks%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Solo curadores/admin';
  END IF;

  SELECT full_name INTO v_name FROM public.profiles WHERE user_id = v_actor;

  SELECT * INTO v_existing FROM public.knowledge_locks WHERE document_id = _document_id;

  IF FOUND AND v_existing.locked_by <> v_actor AND v_existing.expires_at > now() THEN
    RETURN jsonb_build_object(
      'acquired', false,
      'locked_by', v_existing.locked_by,
      'locked_by_name', v_existing.locked_by_name,
      'expires_at', v_existing.expires_at
    );
  END IF;

  INSERT INTO public.knowledge_locks(document_id, locked_by, locked_by_name, section, locked_at, expires_at)
  VALUES (_document_id, v_actor, v_name, _section, now(), now() + interval '5 minutes')
  ON CONFLICT (document_id) DO UPDATE
    SET locked_by = EXCLUDED.locked_by,
        locked_by_name = EXCLUDED.locked_by_name,
        section = EXCLUDED.section,
        locked_at = now(),
        expires_at = now() + interval '5 minutes';

  RETURN jsonb_build_object('acquired', true, 'expires_at', now() + interval '5 minutes');
END;
$$;

CREATE OR REPLACE FUNCTION public.release_knowledge_lock(_document_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.knowledge_locks
   WHERE document_id = _document_id
     AND (locked_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_knowledge_lock(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_knowledge_lock(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_knowledge_lock(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_knowledge_lock(uuid) TO authenticated;

-- ============================================================
-- 6) knowledge_translations_queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_translations_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  source_language text NOT NULL,
  target_language text NOT NULL DEFAULT 'es',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, target_language)
);

GRANT SELECT ON public.knowledge_translations_queue TO authenticated;
GRANT ALL ON public.knowledge_translations_queue TO service_role;

ALTER TABLE public.knowledge_translations_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read translation queue"
  ON public.knowledge_translations_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS knowledge_translations_queue_status_idx ON public.knowledge_translations_queue(status, created_at);

CREATE TRIGGER trg_knowledge_translations_queue_updated_at
  BEFORE UPDATE ON public.knowledge_translations_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-encolar cuando el idioma fuente no es español
CREATE OR REPLACE FUNCTION public.enqueue_knowledge_translation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.source_language IS NOT NULL
     AND NEW.source_language <> 'es'
     AND NEW.status IN ('draft','review')
     AND (TG_OP = 'INSERT' OR OLD.body_md_original IS DISTINCT FROM NEW.body_md_original
          OR OLD.source_language IS DISTINCT FROM NEW.source_language) THEN
    INSERT INTO public.knowledge_translations_queue(document_id, source_language, target_language, status)
    VALUES (NEW.id, NEW.source_language, 'es', 'pending')
    ON CONFLICT (document_id, target_language) DO UPDATE
      SET status = 'pending', attempts = 0, last_error = NULL, updated_at = now();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_knowledge_translation_enqueue
  AFTER INSERT OR UPDATE ON public.knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_knowledge_translation();

-- ============================================================
-- 7) knowledge_ingest_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.knowledge_ingest_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('medlineplus','pubmed','uptodate','csv','manual')),
  query text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_by uuid,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.knowledge_ingest_jobs TO authenticated;
GRANT ALL ON public.knowledge_ingest_jobs TO service_role;

ALTER TABLE public.knowledge_ingest_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage ingest jobs"
  ON public.knowledge_ingest_jobs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_knowledge_ingest_jobs_updated_at
  BEFORE UPDATE ON public.knowledge_ingest_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8) match_knowledge (búsqueda semántica)
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(1536),
  match_count integer DEFAULT 6,
  min_similarity double precision DEFAULT 0.72,
  categories text[] DEFAULT NULL
) RETURNS TABLE (
  document_id uuid,
  chunk_id uuid,
  title text,
  category text,
  source text,
  source_url text,
  snippet text,
  similarity double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT d.id, c.id, d.title, d.category, d.source, d.source_url,
         left(c.content, 400),
         1 - (c.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_chunks c
    JOIN public.knowledge_documents d ON d.id = c.document_id
   WHERE d.is_public = true
     AND d.status = 'published'
     AND c.embedding IS NOT NULL
     AND (categories IS NULL OR d.category = ANY(categories))
     AND (1 - (c.embedding <=> query_embedding)) >= min_similarity
   ORDER BY c.embedding <=> query_embedding
   LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.match_knowledge(vector, integer, double precision, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_knowledge(vector, integer, double precision, text[]) TO anon, authenticated, service_role;

-- ============================================================
-- 9) Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_locks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_ingest_jobs;

-- ============================================================
-- 10) Seed políticas IA para nutrición y recetas
-- ============================================================
INSERT INTO public.ai_provider_policy
  (feature_key, label, model, max_input_tokens, max_output_tokens, history_window,
   enable_cache, cache_ttl_hours, provider, notes,
   supports_references, rag_enabled, rag_categories, rerank_enabled, rerank_top_n, rerank_keep)
VALUES
  ('nutrition_suggestions', 'Sugerencias nutricionales (Kari nutriólogo)',
   'google/gemini-3-flash-preview', 8000, 1500, 6, true, 24, 'lovable',
   'Sugerencias de plan/ajustes nutricionales con base en alergias, semáforo de alimentos y últimas métricas. Con RAG sobre guías clínicas y recetas.',
   true, true, ARRAY['receta','guia_clinica','glosario']::text[], true, 30, 6),
  ('recipe_adapt', 'Adaptación de recetas por IA',
   'google/gemini-3-flash-preview', 6000, 1500, 4, true, 24, 'lovable',
   'Adapta una receta base según restricciones del paciente (alergias, semáforo). Cita fuente MedlinePlus original.',
   true, true, ARRAY['receta','glosario']::text[], true, 20, 5)
ON CONFLICT (feature_key) DO UPDATE SET
  supports_references = EXCLUDED.supports_references,
  rag_enabled = EXCLUDED.rag_enabled,
  rag_categories = EXCLUDED.rag_categories,
  rerank_enabled = EXCLUDED.rerank_enabled,
  rerank_top_n = EXCLUDED.rerank_top_n,
  rerank_keep = EXCLUDED.rerank_keep;

-- Habilitar RAG y referencias en features existentes que se benefician
UPDATE public.ai_provider_policy
   SET supports_references = true,
       rag_enabled = true,
       rag_categories = ARRAY['medicamento','estudio','analisis','guia_clinica','glosario']::text[]
 WHERE feature_key IN ('kari_chat','activity_coach','glossary');

-- ============================================================
-- 11) Seeds mínimos de conocimiento (~30 documentos base)
-- ============================================================
INSERT INTO public.knowledge_documents
  (title, slug, category, summary, body_md, tags, source, source_attribution, is_public, status, published_at)
VALUES
  ('Paracetamol', 'paracetamol', 'medicamento',
   'Analgésico y antipirético de primera línea para dolor leve a moderado y fiebre en adultos y niños.',
   E'# Paracetamol (acetaminofén)\n\n**Uso:** dolor leve/moderado, fiebre.\n\n**Dosis adultos:** 500-1000 mg cada 6-8 h. Máximo 4 g/día.\n**Dosis pediátrica:** 10-15 mg/kg/dosis cada 4-6 h.\n\n**Precauciones:** hepatopatía, alcoholismo. Evitar dosis acumuladas.',
   ARRAY['analgesico','antipiretico','pediatria']::text[],
   'internal', 'CareCentral — información educativa. No sustituye consulta médica.', true, 'published', now()),
  ('Ibuprofeno', 'ibuprofeno', 'medicamento',
   'AINE para dolor, inflamación y fiebre. Cuidado renal y gástrico.',
   E'# Ibuprofeno\n\n**Uso:** dolor musculoesquelético, dismenorrea, fiebre.\n\n**Dosis adultos:** 400-600 mg cada 6-8 h con alimento. Máximo 2400 mg/día.\n\n**Precauciones:** úlcera péptica, ERC, embarazo tercer trimestre.',
   ARRAY['aine','antiinflamatorio']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Metformina', 'metformina', 'medicamento',
   'Primera línea en diabetes tipo 2. Mejora sensibilidad a insulina.',
   E'# Metformina\n\n**Uso:** DM2, prediabetes, SOP.\n\n**Dosis:** iniciar 500 mg con la cena, titular a 500-1000 mg 2 veces/día.\n\n**Contraindicaciones:** TFG <30, acidosis. Suspender 48h antes de contraste.',
   ARRAY['diabetes','antidiabetico']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Losartán', 'losartan', 'medicamento',
   'ARA-II para hipertensión y protección renal en diabéticos.',
   E'# Losartán\n\n**Uso:** hipertensión, nefropatía diabética, ICC.\n\n**Dosis:** 50-100 mg/día.\n\n**Vigilar:** creatinina, potasio. Evitar en embarazo.',
   ARRAY['hipertension','ara2']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Atorvastatina', 'atorvastatina', 'medicamento',
   'Estatina para dislipidemia y prevención cardiovascular.',
   E'# Atorvastatina\n\n**Uso:** hipercolesterolemia, prevención primaria/secundaria CV.\n\n**Dosis:** 10-80 mg/día por la noche.\n\n**Vigilar:** PFH, CK si hay mialgias.',
   ARRAY['estatina','colesterol']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Omeprazol', 'omeprazol', 'medicamento',
   'IBP para reflujo, úlcera y protección gástrica.',
   E'# Omeprazol\n\n**Uso:** ERGE, úlcera péptica, gastroprotección.\n\n**Dosis:** 20-40 mg/día antes del desayuno.\n\n**Cuidado:** uso prolongado puede afectar B12, magnesio, densidad ósea.',
   ARRAY['gastro','ibp']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Amoxicilina', 'amoxicilina', 'medicamento',
   'Penicilina de amplio espectro.',
   E'# Amoxicilina\n\n**Uso:** infecciones respiratorias, urinarias, dentales.\n\n**Dosis:** 500 mg cada 8 h × 7-10 días.\n\n**Alergia a penicilina:** contraindicada.',
   ARRAY['antibiotico','penicilina']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Salbutamol', 'salbutamol', 'medicamento',
   'Broncodilatador de acción corta.',
   E'# Salbutamol\n\n**Uso:** rescate en asma y EPOC.\n\n**Dosis:** 100-200 mcg inhalados cada 4-6 h según necesidad.\n\n**Vigilar:** taquicardia, temblor.',
   ARRAY['asma','broncodilatador']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Enalapril', 'enalapril', 'medicamento',
   'IECA para hipertensión e insuficiencia cardiaca.',
   E'# Enalapril\n\n**Dosis:** 5-40 mg/día divididos.\n\n**Efectos:** tos seca, hiperpotasemia. Evitar en embarazo.',
   ARRAY['hipertension','ieca']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Insulina glargina', 'insulina-glargina', 'medicamento',
   'Insulina basal de acción prolongada.',
   E'# Insulina glargina\n\n**Uso:** DM1 y DM2 insulinorequirente.\n\n**Dosis inicial:** 0.1-0.2 U/kg/día SC nocturna, titular por glucemia en ayuno.\n\n**Riesgo:** hipoglucemia.',
   ARRAY['diabetes','insulina']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),

  -- Estudios y análisis
  ('Biometría hemática (BH)', 'biometria-hematica', 'estudio',
   'Cuenta células sanguíneas: eritrocitos, leucocitos, plaquetas.',
   E'# Biometría hemática\n\nDetecta anemia, infecciones, trombocitopenia.\n\n**Componentes:** Hb, Hto, VCM, HCM, leucocitos con diferencial, plaquetas.\n\n**Preparación:** no requiere ayuno.',
   ARRAY['laboratorio','hematologia']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Química sanguínea de 6 elementos', 'quimica-sanguinea-6', 'estudio',
   'Glucosa, urea, creatinina, ácido úrico, colesterol, triglicéridos.',
   E'# QS-6\n\nEvaluación metabólica básica.\n\n**Preparación:** ayuno 8-12 h.',
   ARRAY['laboratorio','metabolico']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Hemoglobina glicosilada (HbA1c)', 'hba1c', 'analisis',
   'Promedio de glucosa en los últimos 2-3 meses.',
   E'# HbA1c\n\n**Metas:** <5.7% normal, 5.7-6.4% prediabetes, ≥6.5% diabetes.\n\n**Meta terapéutica DM2:** <7% en general; individualizar.\n\n**No requiere ayuno.**',
   ARRAY['diabetes','laboratorio']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Perfil lipídico', 'perfil-lipidico', 'analisis',
   'Colesterol total, HDL, LDL, triglicéridos, VLDL.',
   E'# Perfil lipídico\n\n**Metas generales:** LDL <100 mg/dL, HDL >40 (H) / >50 (M), TG <150.\n\n**Preparación:** ayuno 9-12 h.',
   ARRAY['cardiovascular','laboratorio']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Examen general de orina (EGO)', 'ego', 'estudio',
   'Analiza aspecto, densidad, pH, glucosa, proteínas, sedimento.',
   E'# EGO\n\nDetecta infecciones urinarias, hematuria, proteinuria, glucosuria.\n\n**Muestra:** chorro medio de primera orina de la mañana.',
   ARRAY['nefro','laboratorio']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Pruebas de función hepática (PFH)', 'pfh', 'estudio',
   'ALT, AST, FA, GGT, bilirrubinas, albúmina.',
   E'# PFH\n\nEvalúa daño hepatocelular vs colestasis y función sintética.\n\n**Preparación:** ayuno 8 h.',
   ARRAY['hepato','laboratorio']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('TSH y T4 libre', 'tsh-t4', 'analisis',
   'Función tiroidea.',
   E'# TSH y T4L\n\n**Hipotiroidismo:** TSH↑ T4L↓.\n**Hipertiroidismo:** TSH↓ T4L↑.\n\nToma preferentemente en la mañana.',
   ARRAY['endocrino','laboratorio']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Antígeno prostático específico (PSA)', 'psa', 'analisis',
   'Marcador para tamizaje y seguimiento de cáncer de próstata.',
   E'# PSA\n\n**Referencia:** <4 ng/mL. Elevado en cáncer, HPB, prostatitis.\n\n**Evitar:** eyaculación 48h antes, tacto rectal.',
   ARRAY['uro','cancer']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Papanicolaou', 'papanicolaou', 'estudio',
   'Tamizaje de cáncer cervicouterino.',
   E'# Papanicolaou\n\nCada 3 años en mujeres 21-65 años, o cada 5 años con co-test VPH.\n\n**Evitar:** menstruación, óvulos, relaciones 48h antes.',
   ARRAY['gineco','cancer']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),
  ('Electrocardiograma (ECG)', 'ecg', 'estudio',
   'Registro eléctrico del corazón.',
   E'# ECG de 12 derivaciones\n\nDetecta arritmias, isquemia, hipertrofia, alteraciones electrolíticas.\n\n**Preparación:** piel limpia, sin cremas.',
   ARRAY['cardio']::text[],
   'internal', 'CareCentral — información educativa.', true, 'published', now()),

  -- Guías clínicas breves
  ('Manejo inicial de hipertensión arterial', 'guia-hipertension', 'guia_clinica',
   'Diagnóstico, metas y tratamiento escalonado.',
   E'# Hipertensión\n\n**Diagnóstico:** ≥140/90 en consultorio confirmado con MAPA o AMPA.\n\n**Meta:** <130/80 en la mayoría.\n\n**Primera línea:** IECA/ARA-II, calcioantagonistas o tiazidas.\n\n**Estilo de vida:** dieta DASH, <2 g Na/día, ejercicio 150 min/sem.',
   ARRAY['cardio','hta']::text[],
   'internal', 'CareCentral — resumen educativo basado en GPC IMSS/SSA.', true, 'published', now()),
  ('Diabetes tipo 2 — manejo básico', 'guia-diabetes-2', 'guia_clinica',
   'Tamizaje, metas, tratamiento y complicaciones.',
   E'# DM2\n\n**Tamizaje:** ≥35 años o factores de riesgo (obesidad, familiar 1er grado, HTA, dislipidemia).\n\n**Metas típicas:** HbA1c <7%, PA <130/80, LDL <100.\n\n**Escalón:** metformina → agregar SGLT2i/GLP1-RA si CV/renal, iSDPP-4, sulfonilurea, insulina basal.\n\n**Educación:** automonitoreo, alimentación, ejercicio, pie diabético.',
   ARRAY['endocrino','diabetes']::text[],
   'internal', 'CareCentral — resumen educativo.', true, 'published', now()),
  ('Obesidad y sobrepeso — enfoque nutricional', 'guia-obesidad', 'guia_clinica',
   'Objetivos, dieta y actividad física.',
   E'# Obesidad\n\n**Meta razonable:** 5-10% de pérdida en 6 meses.\n\n**Déficit:** 500-750 kcal/día. Priorizar proteína (1.2-1.6 g/kg), fibra >25 g, reducir azúcares añadidos.\n\n**Actividad:** ≥150 min/sem aeróbica + fuerza 2 días.',
   ARRAY['nutricion','obesidad']::text[],
   'internal', 'CareCentral — resumen educativo.', true, 'published', now()),
  ('Asma — manejo escalonado', 'guia-asma', 'guia_clinica',
   'GINA escalones y rescate.',
   E'# Asma\n\n**Rescate:** SABA o ICS-formoterol dosis baja.\n\n**Escalón 1-2:** ICS dosis baja diaria o según necesidad con ICS-formoterol.\n\n**Educación:** técnica inhalatoria, plan de acción escrito, evitar disparadores.',
   ARRAY['neumo','asma']::text[],
   'internal', 'CareCentral — resumen educativo.', true, 'published', now()),
  ('Dislipidemia — objetivos LDL', 'guia-dislipidemia', 'guia_clinica',
   'Estratificación de riesgo CV y metas LDL.',
   E'# Dislipidemia\n\n**Riesgo alto/muy alto:** LDL <70 (o <55 en muy alto).\n**Riesgo moderado:** LDL <100.\n\n**Terapia:** estatina de alta intensidad + estilo de vida. Ezetimibe si no llega a meta.',
   ARRAY['cardio','lipidos']::text[],
   'internal', 'CareCentral — resumen educativo.', true, 'published', now()),

  -- Glosario
  ('Índice glucémico (IG)', 'glosario-ig', 'glosario',
   'Escala 0-100 que mide cuánto sube la glucosa un alimento.',
   E'# Índice glucémico\n\n**Bajo:** ≤55 (avena, leguminosas, manzana).\n**Medio:** 56-69.\n**Alto:** ≥70 (pan blanco, arroz blanco, papa).\n\nÚtil para diabetes y control de peso.',
   ARRAY['nutricion','diabetes']::text[],
   'internal', 'CareCentral — glosario.', true, 'published', now()),
  ('Índice de masa corporal (IMC)', 'glosario-imc', 'glosario',
   'Peso (kg) / talla² (m).',
   E'# IMC\n\n**<18.5:** bajo peso.\n**18.5-24.9:** normal.\n**25-29.9:** sobrepeso.\n**≥30:** obesidad.\n\nNo considera composición corporal; complementar con perímetro abdominal.',
   ARRAY['antropometria']::text[],
   'internal', 'CareCentral — glosario.', true, 'published', now()),
  ('Presión arterial — categorías', 'glosario-pa', 'glosario',
   'Definiciones de PA en adultos.',
   E'# Presión arterial\n\n**Óptima:** <120/80.\n**Normal alta:** 130-139/85-89.\n**HTA grado 1:** 140-159/90-99.\n**HTA grado 2:** ≥160/100.',
   ARRAY['cardio','hta']::text[],
   'internal', 'CareCentral — glosario.', true, 'published', now()),
  ('Saturación de oxígeno (SpO₂)', 'glosario-spo2', 'glosario',
   'Porcentaje de hemoglobina saturada con oxígeno.',
   E'# SpO₂\n\n**Normal:** 95-100%.\n**Leve hipoxemia:** 90-94%.\n**Grave:** <90%, requiere atención.\n\nEn EPOC objetivo suele ser 88-92%.',
   ARRAY['neumo']::text[],
   'internal', 'CareCentral — glosario.', true, 'published', now()),
  ('Semáforo de alimentos', 'glosario-semaforo', 'glosario',
   'Sistema visual para clasificar alimentos por densidad nutricional.',
   E'# Semáforo\n\n**Verde:** consumo libre — verduras, frutas enteras, leguminosas, granos integrales, proteína magra, agua.\n**Amarillo:** consumo moderado — lácteos enteros, cereales refinados, jugos naturales, tubérculos.\n**Rojo:** ocasional — azúcar añadida, ultraprocesados, embutidos, refrescos.',
   ARRAY['nutricion']::text[],
   'internal', 'CareCentral — glosario.', true, 'published', now())
ON CONFLICT (slug) DO NOTHING;

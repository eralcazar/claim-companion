// Helpers compartidos para políticas de IA por feature y caché de respuestas.
// Import via: import { ... } from "../_shared/ai-router.ts";

// Deno global (edge runtime)
declare const Deno: { env: { get(name: string): string | undefined } };

export type AiPolicy = {
  feature_key: string;
  model: string;
  max_input_tokens: number;
  max_output_tokens: number;
  history_window: number;
  enable_cache: boolean;
  cache_ttl_hours: number;
  provider?: string;
  external_endpoint?: string | null;
};

const DEFAULT_POLICY: AiPolicy = {
  feature_key: "default",
  model: "google/gemini-3-flash-preview",
  max_input_tokens: 4000,
  max_output_tokens: 1200,
  history_window: 8,
  enable_cache: false,
  cache_ttl_hours: 720,
  provider: "lovable",
  external_endpoint: null,
};

// Micro-USD por token para cada modelo (aprox Lovable AI Gateway).
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "google/gemini-3-flash-preview": { input: 30, output: 250 },
  "google/gemini-2.5-flash": { input: 30, output: 250 },
  "google/gemini-2.5-flash-lite": { input: 10, output: 80 },
  "google/gemini-2.5-pro": { input: 1250, output: 5000 },
};

export async function loadPolicy(
  admin: any,
  featureKey: string,
): Promise<AiPolicy> {
  try {
    const { data } = await admin
      .from("ai_provider_policy")
      .select("feature_key, model, max_input_tokens, max_output_tokens, history_window, enable_cache, cache_ttl_hours, provider, external_endpoint")
      .eq("feature_key", featureKey)
      .maybeSingle();
    if (data) return { provider: "lovable", external_endpoint: null, ...(data as AiPolicy) };
  } catch (e) {
    console.warn("loadPolicy fallback:", e);
  }
  return { ...DEFAULT_POLICY, feature_key: featureKey };
}

// Normaliza un prompt para poder hashearlo y compararlo con el caché.
// Remueve PII simple para reducir riesgo de cachear datos personales.
export function normalizePrompt(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    // curp
    .replace(/\b[a-z]{4}\d{6}[hm][a-z]{5}[a-z0-9]\d\b/gi, "[curp]")
    // rfc
    .replace(/\b[a-z&ñ]{3,4}\d{6}[a-z0-9]{3}\b/gi, "[rfc]")
    // emails
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]")
    // teléfonos MX
    .replace(/\b\d{10}\b/g, "[tel]")
    // fechas dd/mm/aaaa o aaaa-mm-dd
    .replace(/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/g, "[fecha]")
    // números grandes (mediciones específicas, ids)
    .replace(/\b\d{4,}\b/g, "[num]")
    // signos de puntuación irrelevantes
    .replace(/[¿?¡!.,;:()"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// SHA-256 hex del prompt normalizado. Deno tiene Web Crypto nativo.
export async function hashPrompt(normalized: string): Promise<string> {
  const data = new TextEncoder().encode(normalized);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Heurística: ¿el prompt es lo suficientemente genérico para cachearse?
// Rechaza prompts con contexto personal detectable (nombres propios, mediciones específicas,
// pronombres personales fuertes tipo "mi", "yo tengo", "mi paciente", "mi hijo").
export function isCacheableGeneric(originalText: string, normalizedText: string): boolean {
  const original = originalText.trim();
  if (original.length < 8 || original.length > 500) return false;

  // Frases que denotan contexto personal
  const personalMarkers = [
    /\bmi (dolor|paciente|hijo|hija|mam[áa]|pap[áa]|esposa|esposo|abuel|hermano|hermana)\b/i,
    /\byo (tengo|tomo|siento|padezco|uso)\b/i,
    /\bme (duele|siento|dieron|recetaron|dijeron)\b/i,
    /\b(hoy|ayer|anoche|esta ma[ñn]ana|hace \d+)\b/i,
    /\b\d{2,3}\/\d{2,3}\b/, // presión arterial 120/80
    /\bmg\/dl\b/i,
    /\bmmhg\b/i,
  ];
  if (personalMarkers.some((rx) => rx.test(original))) return false;

  // Debe ser una pregunta educativa: contener palabras clave de definición/consulta general
  const educationalMarkers = [
    /\bqu[ée] es\b/i,
    /\bpara qu[ée] sirve\b/i,
    /\bc[oó]mo funciona\b/i,
    /\bdiferencia entre\b/i,
    /\bs[ií]ntomas de\b/i,
    /\bcausas de\b/i,
    /\brecomendaciones? generales?\b/i,
    /\bexplica(me)?\b/i,
    /\bdefinici[oó]n de\b/i,
  ];
  return educationalMarkers.some((rx) => rx.test(original));
}

export async function lookupCache(
  admin: any,
  featureKey: string,
  promptHash: string,
): Promise<{ response: string; tokens_saved: number; model: string } | null> {
  try {
    const { data } = await admin
      .from("ai_response_cache")
      .select("response, tokens_saved, model, expires_at")
      .eq("feature_key", featureKey)
      .eq("prompt_hash", promptHash)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at as string) < new Date()) return null;
    // Fire and forget: incrementar hit_count
    admin.rpc("increment_ai_cache_hit", { _feature_key: featureKey, _prompt_hash: promptHash })
      .then(() => {})
      .catch(() => {
        // Fallback: update directo si el RPC no existe
        admin
          .from("ai_response_cache")
          .update({ hit_count: (data as any).hit_count ? (data as any).hit_count + 1 : 1, last_hit_at: new Date().toISOString() })
          .eq("feature_key", featureKey)
          .eq("prompt_hash", promptHash)
          .then(() => {});
      });
    return {
      response: data.response as string,
      tokens_saved: (data.tokens_saved as number) ?? 0,
      model: data.model as string,
    };
  } catch (e) {
    console.warn("lookupCache error:", e);
    return null;
  }
}

export async function saveCache(
  admin: any,
  featureKey: string,
  promptHash: string,
  promptNormalized: string,
  response: string,
  model: string,
  tokensSaved: number,
  ttlHours: number,
): Promise<void> {
  try {
    const expires = new Date(Date.now() + ttlHours * 3600_000).toISOString();
    await admin.from("ai_response_cache").upsert(
      {
        feature_key: featureKey,
        prompt_hash: promptHash,
        prompt_normalized: promptNormalized.slice(0, 500),
        response,
        model,
        tokens_saved: tokensSaved,
        expires_at: expires,
      },
      { onConflict: "feature_key,prompt_hash" },
    );
  } catch (e) {
    console.warn("saveCache error:", e);
  }
}

// Llama al gateway con un cuerpo mínimo compatible OpenAI.
export async function callGateway(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { maxOutputTokens?: number; responseFormat?: "json_object" } = {},
): Promise<{ ok: boolean; status: number; content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; rawText?: string }> {
  const body: any = { model, messages };
  if (opts.maxOutputTokens) body.max_tokens = opts.maxOutputTokens;
  if (opts.responseFormat) body.response_format = { type: opts.responseFormat };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return {
      ok: false,
      status: resp.status,
      content: "",
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      rawText: t,
    };
  }

  const json = await resp.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  const pt = Number(json?.usage?.prompt_tokens) || 0;
  const ct = Number(json?.usage?.completion_tokens) || 0;
  const tt = Number(json?.usage?.total_tokens) || pt + ct;
  return {
    ok: true,
    status: resp.status,
    content,
    usage: { prompt_tokens: pt, completion_tokens: ct, total_tokens: tt },
  };
}

// Trunca un texto largo a `maxChars` y añade indicador.
export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "…[truncado]";
}

// ────────────────────────────────────────────────────────────────
// Proveedor externo: ApiFreeLLM (compatible OpenAI, sin API key)
// ────────────────────────────────────────────────────────────────
export async function callApiFreeLLM(
  endpoint: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { maxOutputTokens?: number; responseFormat?: "json_object" } = {},
): Promise<{ ok: boolean; status: number; content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; rawText?: string }> {
  const body: any = { model, messages };
  if (opts.maxOutputTokens) body.max_tokens = opts.maxOutputTokens;
  if (opts.responseFormat) body.response_format = { type: opts.responseFormat };
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return { ok: false, status: resp.status, content: "", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, rawText: t };
    }
    const json = await resp.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const pt = Number(json?.usage?.prompt_tokens) || 0;
    const ct = Number(json?.usage?.completion_tokens) || 0;
    const tt = Number(json?.usage?.total_tokens) || pt + ct;
    return { ok: true, status: resp.status, content, usage: { prompt_tokens: pt, completion_tokens: ct, total_tokens: tt } };
  } catch (e: any) {
    return { ok: false, status: 0, content: "", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, rawText: e?.message ?? "network_error" };
  }
}

// ────────────────────────────────────────────────────────────────
// Proveedores externos BYOK (Bring Your Own Key) — OpenAI-compatible
// Cubre Google Gemini (endpoint /openai) y Mistral AI. Ambos aceptan
// el mismo shape que ApiFreeLLM más el header `Authorization: Bearer`.
// ────────────────────────────────────────────────────────────────
export async function callByokProvider(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { maxOutputTokens?: number; responseFormat?: "json_object" } = {},
): Promise<{ ok: boolean; status: number; content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; rawText?: string }> {
  const body: any = { model, messages };
  if (opts.maxOutputTokens) body.max_tokens = opts.maxOutputTokens;
  if (opts.responseFormat) body.response_format = { type: opts.responseFormat };
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      return { ok: false, status: resp.status, content: "", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, rawText: t };
    }
    const json = await resp.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const pt = Number(json?.usage?.prompt_tokens) || 0;
    const ct = Number(json?.usage?.completion_tokens) || 0;
    const tt = Number(json?.usage?.total_tokens) || pt + ct;
    return { ok: true, status: resp.status, content, usage: { prompt_tokens: pt, completion_tokens: ct, total_tokens: tt } };
  } catch (e: any) {
    return { ok: false, status: 0, content: "", usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, rawText: e?.message ?? "network_error" };
  }
}

// Devuelve el nombre del secret (env var) esperado para cada provider externo.
// Estático para evitar un round-trip a DB dentro del hot path.
export function externalProviderSecretName(provider: string): string | null {
  switch (provider) {
    case "gemini":
      return "GEMINI_API_KEY";
    case "mistral":
      return "MISTRAL_API_KEY";
    default:
      return null; // apifreellm y otros sin key
  }
}

// Despacha una llamada externa según el provider de la política.
// Retorna `{ ok:false, status:401 }` si falta la API key para BYOK.
export async function dispatchExternalProvider(
  provider: string,
  endpoint: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { maxOutputTokens?: number; responseFormat?: "json_object" } = {},
): Promise<{ ok: boolean; status: number; content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; rawText?: string; missingKey?: boolean }> {
  const secretName = externalProviderSecretName(provider);
  if (secretName) {
    const key = Deno.env.get(secretName);
    if (!key) {
      return {
        ok: false,
        status: 401,
        content: "",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        rawText: `missing_api_key:${secretName}`,
        missingKey: true,
      };
    }
    return callByokProvider(endpoint, key, model, messages, opts);
  }
  return callApiFreeLLM(endpoint, model, messages, opts);
}

// ────────────────────────────────────────────────────────────────
// Sanitización y detección de PII (espejo de src/lib/ai/sanitize.ts)
// ────────────────────────────────────────────────────────────────
export function detectPiiFields(original: string): string[] {
  const rules: Array<[string, RegExp]> = [
    ["curp", /\b[a-z]{4}\d{6}[hm][a-z]{5}[a-z0-9]\d\b/i],
    ["rfc", /\b[a-z&ñ]{3,4}\d{6}[a-z0-9]{3}\b/i],
    ["email", /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/],
    ["telefono", /(\+\d{1,3}[\s-]?)?\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/],
    ["fecha", /\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/],
    ["direccion", /\b(calle|avenida|av\.|colonia|col\.|c\.p\.|codigo postal|cp)\b/i],
    ["coordenada", /-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}/],
    ["numero_largo", /\b\d{4,}\b/],
  ];
  const found = new Set<string>();
  for (const [label, rx] of rules) if (rx.test(original)) found.add(label);
  return Array.from(found);
}

export function hasResidualPii(sanitized: string): boolean {
  const patterns = [
    /\b(calle|avenida|av\.|colonia|col\.|c\.p\.|codigo postal|cp)\b/i,
    /-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}/,
    /\+\d{1,3}(?:[\s-]?\d{1,4}){2,5}/,
    /\b\d{3}[\s-]\d{3}[\s-]\d{4}\b/,
  ];
  return patterns.some((rx) => rx.test(sanitized));
}

// ────────────────────────────────────────────────────────────────
// Governance: kill switch + consentimiento + auditoría automática
// ────────────────────────────────────────────────────────────────

export type GovernanceDecision =
  | { allowed: true; provider: "external"; reason?: undefined }
  | { allowed: false; provider: "fallback"; reason: "kill_switch" | "consent_revoked" | "residual_pii" | "no_user" };

/**
 * Consulta ai_settings.external_providers_enabled y ai_feature_consents.
 * Devuelve la decisión de enrutamiento antes de cualquier llamada externa.
 */
export async function checkGovernance(
  admin: any,
  userId: string | null,
  featureKey: string,
): Promise<GovernanceDecision> {
  try {
    const { data } = await admin.rpc("can_call_external_ai", {
      _user_id: userId,
      _feature_key: featureKey,
    });
    const allowed = Boolean(data?.allowed);
    if (allowed) return { allowed: true, provider: "external" };
    const reason = (data?.reason ?? "consent_revoked") as
      | "kill_switch"
      | "consent_revoked"
      | "no_user";
    return { allowed: false, provider: "fallback", reason };
  } catch (_e) {
    // Fail-closed: si no podemos verificar, no salimos al exterior.
    return { allowed: false, provider: "fallback", reason: "consent_revoked" };
  }
}

export type AuditRecord = {
  userId: string | null;
  featureKey: string;
  provider: string;
  model: string | null;
  sanitized: boolean;
  sanitizationNotes: string | null;
  sanitizedPrompt: string | null;
  piiFieldsDetected: string[];
  fallbackUsed: boolean;
  status: string;
  blockedReason: string | null;
  consentChecked: boolean;
  inputChars: number;
  outputChars: number;
  latencyMs: number | null;
};

export async function recordAiAudit(admin: any, rec: AuditRecord): Promise<void> {
  try {
    await admin.rpc("log_ai_audit", {
      _user_id: rec.userId,
      _feature_key: rec.featureKey,
      _provider: rec.provider,
      _model: rec.model,
      _sanitized: rec.sanitized,
      _sanitization_notes: rec.sanitizationNotes,
      _sanitized_prompt: rec.sanitizedPrompt,
      _pii_fields: rec.piiFieldsDetected,
      _fallback_used: rec.fallbackUsed,
      _status: rec.status,
      _blocked_reason: rec.blockedReason,
      _consent_checked: rec.consentChecked,
      _input_chars: rec.inputChars,
      _output_chars: rec.outputChars,
      _latency_ms: rec.latencyMs,
    });
  } catch (e) {
    console.warn("recordAiAudit failed:", e);
  }
}

/**
 * Orquestador seguro para cualquier feature que quiera invocar un proveedor externo.
 * - Verifica kill switch + consentimiento vía checkGovernance.
 * - Sanitiza el prompt del usuario y detecta PII.
 * - Si hay PII residual tras sanitizar, bloquea también.
 * - En bloqueo: llama fallback() (Lovable AI interno) y marca fallback_used.
 * - En cualquier caso, registra una fila en ai_provider_audit con evidencia.
 */
export async function routeExternalOrFallback(params: {
  admin: any;
  userId: string | null;
  featureKey: string;
  provider: string;
  model: string | null;
  rawUserPrompt: string;
  external: () => Promise<{ content: string; status?: string }>;
  fallback: () => Promise<{ content: string; status?: string }>;
  requireGeneric?: boolean;
}): Promise<{ content: string; provider: string; fallbackUsed: boolean; blockedReason: string | null }> {
  const started = Date.now();
  const decision = await checkGovernance(params.admin, params.userId, params.featureKey);

  const pii = detectPiiFields(params.rawUserPrompt);
  const sanitized = normalizePrompt(params.rawUserPrompt);
  const notes = pii.length ? `sanitized:${pii.join(",")}` : null;

  let blockedReason: string | null = decision.allowed ? null : decision.reason;
  let allowExternal = decision.allowed;

  // Red de seguridad: si tras sanitizar sigue habiendo PII, no salgas al exterior.
  if (allowExternal && hasResidualPii(sanitized)) {
    allowExternal = false;
    blockedReason = "residual_pii";
  }

  // Gate opcional: si la feature exige prompts educativos genéricos y este no lo es,
  // no sale al exterior aunque haya consentimiento.
  if (allowExternal && params.requireGeneric && !isCacheableGeneric(params.rawUserPrompt, sanitized)) {
    allowExternal = false;
    blockedReason = "not_generic";
  }

  let content = "";
  let status = "ok";
  let providerUsed = allowExternal ? params.provider : "lovable";
  let fallbackUsed = !allowExternal;

  try {
    const res = allowExternal ? await params.external() : await params.fallback();
    content = res.content ?? "";
    status = res.status ?? "ok";
  } catch (e: any) {
    status = "error:" + (e?.message ?? "unknown").slice(0, 120);
  }

  await recordAiAudit(params.admin, {
    userId: params.userId,
    featureKey: params.featureKey,
    provider: providerUsed,
    model: params.model,
    sanitized: pii.length > 0,
    sanitizationNotes: notes,
    sanitizedPrompt: sanitized.slice(0, 2000),
    piiFieldsDetected: pii,
    fallbackUsed,
    status,
    blockedReason,
    consentChecked: true,
    inputChars: params.rawUserPrompt.length,
    outputChars: content.length,
    latencyMs: Date.now() - started,
  });

  return { content, provider: providerUsed, fallbackUsed, blockedReason };
}

// Poda la ventana de historial: mantiene los últimos `window` mensajes.
// Si hay más, resume los primeros con una llamada barata al gateway.
export async function pruneHistory(
  apiKey: string,
  history: Array<{ role: string; content: string }>,
  window: number,
  summarizerModel = "google/gemini-2.5-flash-lite",
): Promise<Array<{ role: string; content: string }>> {
  if (history.length <= window) return history;
  const toSummarize = history.slice(0, history.length - window);
  const keep = history.slice(-window);
  const joined = toSummarize
    .map((m) => `${m.role === "user" ? "Usuario" : "Kari"}: ${truncateText(m.content, 400)}`)
    .join("\n");
  const sum = await callGateway(
    apiKey,
    summarizerModel,
    [
      {
        role: "system",
        content:
          "Resume la siguiente conversación médica en español, en 3-5 oraciones, conservando síntomas, medicamentos, indicaciones y contexto clínico relevante. Sin markdown.",
      },
      { role: "user", content: joined },
    ],
    { maxOutputTokens: 300 },
  );
  if (!sum.ok || !sum.content) return keep;
  return [
    { role: "system", content: `Resumen de la conversación previa: ${sum.content}` },
    ...keep,
  ];
}
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, RefreshCw, CheckCircle2, XCircle, Loader2, Copy, ShieldAlert, Zap, History, ListTree, AlertTriangle, RotateCw, Power, Sparkles, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useExternalProviders } from "@/hooks/useAiPolicies";
import { Link } from "react-router-dom";

type SecretStatus = {
  name: string;
  configured: boolean;
  length: number;
  preview: string | null;
  last_action?: string | null;
  last_action_at?: string | null;
  last_actor_email?: string | null;
  last_test_status?: string | null;
  last_test_at?: string | null;
  last_test_latency_ms?: number | null;
  last_test_error?: string | null;
};

type AuditRow = {
  id: string;
  secret_name: string;
  action: string;
  actor_email: string | null;
  latency_ms: number | null;
  model_used: string | null;
  error_message: string | null;
  note: string | null;
  created_at: string;
};

type TestDiag = {
  cause: string;
  hint: string;
  raw: string;
  status?: number;
  locked: boolean; // si true, deshabilita "Probar ahora" hasta que el usuario reactive
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(diff)) return iso;
  const s = Math.round(diff / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

// Traduce cualquier fallo de invoke() o payload { ok:false } a un diagnóstico
// legible con causa probable y sugerencia de acción concreta.
function diagnoseTestError(params: {
  invokeError: any;
  data: any;
  secretConfigured: boolean;
}): TestDiag {
  const { invokeError, data, secretConfigured } = params;
  const raw =
    invokeError?.message ??
    data?.error_message ??
    data?.error ??
    "Error desconocido";
  const status: number | undefined =
    invokeError?.context?.status ??
    invokeError?.status ??
    data?.status;
  const rawLower = String(raw).toLowerCase();

  // Función no desplegada / ruta inexistente
  if (status === 404 || rawLower.includes("not found") || rawLower.includes("no such function")) {
    return {
      cause: "La edge function test-ai-provider no está desplegada (404).",
      hint: "Pídele a Lovable en el chat: “Desplega la edge function test-ai-provider”. Luego vuelve a Probar ahora.",
      raw, status, locked: true,
    };
  }
  // Falta secret
  if (!secretConfigured || rawLower.includes("missing_api_key") || rawLower.includes("api key")) {
    return {
      cause: "La API key BYOK del proveedor no está configurada en el backend.",
      hint: "Usa el botón Copiar instrucción y pégala en el chat de Lovable para abrir el formulario seguro.",
      raw, status, locked: false,
    };
  }
  // Auth
  if (status === 401 || status === 403 || rawLower.includes("unauthorized") || rawLower.includes("forbidden")) {
    return {
      cause: "El proveedor rechazó la key (401/403). Puede estar revocada, mal copiada o sin permisos del modelo.",
      hint: "Genera una nueva key en el panel del proveedor y rótala con el botón Copiar instrucción para rotar.",
      raw, status, locked: false,
    };
  }
  if (status === 402 || rawLower.includes("insufficient") || rawLower.includes("quota") || rawLower.includes("billing")) {
    return {
      cause: "El proveedor reportó falta de créditos / facturación (402).",
      hint: "Recarga créditos o habilita facturación en la consola del proveedor y reintenta.",
      raw, status, locked: false,
    };
  }
  if (status === 429 || rawLower.includes("rate limit") || rawLower.includes("too many")) {
    return {
      cause: "Rate limit del proveedor (429).",
      hint: "Espera unos segundos y presiona Reintentar. Si persiste, revisa cuotas en la consola del proveedor.",
      raw, status, locked: false,
    };
  }
  if (status === 400 || rawLower.includes("invalid") || rawLower.includes("bad request")) {
    return {
      cause: "Petición inválida (400). Suele significar modelo inexistente o formato de key incorrecto.",
      hint: "Sincroniza modelos y verifica que el default_model exista en el catálogo del proveedor.",
      raw, status, locked: false,
    };
  }
  if (status && status >= 500) {
    return {
      cause: `Error del proveedor (${status}).`,
      hint: "Reintenta en unos segundos. Si persiste, revisa el status page del proveedor.",
      raw, status, locked: false,
    };
  }
  if (rawLower.includes("failed to fetch") || rawLower.includes("network")) {
    return {
      cause: "No se pudo alcanzar la edge function (red o CORS).",
      hint: "Verifica tu conexión y vuelve a intentar. Si persiste, pídele a Lovable que re-despliegue test-ai-provider.",
      raw, locked: true,
    };
  }
  return {
    cause: "Falló la prueba por una razón no clasificada.",
    hint: "Revisa el detalle debajo y reintenta. Si se repite, pídele a Lovable que inspeccione los logs de test-ai-provider.",
    raw, status, locked: false,
  };
}

const PROVIDER_META: Record<
  string,
  { label: string; docs: string; where: string; provider: string; prefix: string; length: string }
> = {
  GEMINI_API_KEY: {
    label: "Google Gemini",
    docs: "https://aistudio.google.com/apikey",
    where: "Google AI Studio → Get API key",
    provider: "gemini",
    prefix: "AIza… (39 chars aprox)",
    length: "≈ 39",
  },
  MISTRAL_API_KEY: {
    label: "Mistral AI",
    docs: "https://console.mistral.ai/api-keys",
    where: "Mistral Console → API Keys",
    provider: "mistral",
    prefix: "cadena hex de 32+ chars",
    length: "≈ 32-64",
  },
  ANTHROPIC_API_KEY: {
    label: "Anthropic Claude",
    docs: "https://console.anthropic.com/settings/keys",
    where: "Anthropic Console → API Keys",
    provider: "claude",
    prefix: "sk-ant-… (100+ chars)",
    length: "≈ 100+",
  },
};

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "hace segundos";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

export default function ApiKeysMaintenance() {
  const { roles } = useAuth();
  const { data: externalProviders } = useExternalProviders();
  const [loading, setLoading] = useState(true);
  const [secrets, setSecrets] = useState<SecretStatus[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  // Último diagnóstico y bloqueo por secret (para 404 / red se bloquea el
  // botón hasta que el admin lo reactive explícitamente).
  const [diag, setDiag] = useState<Record<string, TestDiag | null>>({});
  const [history, setHistory] = useState<AuditRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Fingerprint por secret (length|preview|last_action_at). Al detectar un
  // cambio (guardado/rotación) dispara automáticamente runTest en Gemini.
  const fingerprintRef = useRef<Record<string, string>>({});
  const autoTestedRef = useRef<Set<string>>(new Set());
  const [autoTestPending, setAutoTestPending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("check-ai-secrets");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const next: SecretStatus[] = data?.secrets ?? [];
      setSecrets(next);
      setCheckedAt(data?.checked_at ?? null);
      // Detectar cambios en GEMINI_API_KEY y disparar auto-test.
      const gemini = next.find((s) => s.name === "GEMINI_API_KEY");
      if (gemini?.configured) {
        const fp = `${gemini.length}|${gemini.preview ?? ""}|${gemini.last_action_at ?? ""}`;
        const prev = fingerprintRef.current["GEMINI_API_KEY"];
        const neverTested = !gemini.last_test_at;
        const changed = prev !== undefined && prev !== fp;
        fingerprintRef.current["GEMINI_API_KEY"] = fp;
        if ((changed || (neverTested && !autoTestedRef.current.has(fp))) && !testing["GEMINI_API_KEY"]) {
          autoTestedRef.current.add(fp);
          setAutoTestPending("GEMINI_API_KEY");
        }
      }
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("ai_api_key_audit" as any)
      .select("id, secret_name, action, actor_email, latency_ms, model_used, error_message, note, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error) setHistory((data ?? []) as unknown as AuditRow[]);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (roles?.includes("admin")) {
      load();
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  // Ejecuta el auto-test cuando `load()` detectó cambio en la key.
  useEffect(() => {
    if (!autoTestPending) return;
    const name = autoTestPending;
    setAutoTestPending(null);
    toast({
      title: "Detecté un cambio en GEMINI_API_KEY",
      description: "Probando Gemini automáticamente…",
    });
    runTest(name, { auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTestPending]);

  if (roles && !roles.includes("admin")) return <Navigate to="/dashboard" replace />;

  const copyPrompt = async (secretName: string, action: "configura" | "rota") => {
    const meta = PROVIDER_META[secretName];
    const lines = [
      `${action === "configura" ? "Configura" : "Rota"} el secret ${secretName} para el proveedor BYOK de IA.`,
      ``,
      `Detalles esperados:`,
      `- Nombre exacto del secret: ${secretName}`,
      `- Proveedor: ${meta?.label ?? "—"}`,
      `- Formato esperado: ${meta?.prefix ?? "—"}`,
      `- Longitud aproximada: ${meta?.length ?? "—"}`,
      `- Obtenla en: ${meta?.docs ?? "—"}`,
      ``,
      `Después de guardar, valida el valor con test-ai-provider antes de cerrar el formulario seguro,`,
      `y avísame para volver a /admin/api-keys y probar la conexión con el botón "Probar ahora".`,
    ];
    const prompt = lines.join("\n");
    await navigator.clipboard.writeText(prompt);
    toast({
      title: "Instrucción copiada",
      description: "Pégala en el chat de Lovable. Incluye formato esperado y validación posterior.",
    });
  };

  const runTest = async (secretName: string, opts?: { auto?: boolean }) => {
    const meta = PROVIDER_META[secretName];
    if (!meta) return;
    const secret = secrets.find((x) => x.name === secretName);
    setTesting((t) => ({ ...t, [secretName]: true }));
    const { data, error } = await supabase.functions.invoke("test-ai-provider", {
      body: { provider: meta.provider },
    });
    setTesting((t) => ({ ...t, [secretName]: false }));
    if (!error && data?.ok) {
      setDiag((d) => ({ ...d, [secretName]: null }));
      toast({
        title: `${meta.label}: OK${opts?.auto ? " (auto-test)" : ""}`,
        description: `Modelo ${data.model_used} respondió en ${data.latency_ms} ms.`,
      });
    } else {
      const d = diagnoseTestError({
        invokeError: error,
        data,
        secretConfigured: !!secret?.configured,
      });
      setDiag((prev) => ({ ...prev, [secretName]: d }));
      toast({
        title: `${meta.label}: falló${opts?.auto ? " (auto-test)" : ""}`,
        description: d.cause,
        variant: "destructive",
      });
    }
    await Promise.all([load(), loadHistory()]);
  };

  const runSync = async (secretName: string) => {
    const meta = PROVIDER_META[secretName];
    if (!meta) return;
    setSyncing((t) => ({ ...t, [secretName]: true }));
    const { data, error } = await supabase.functions.invoke("sync-ai-provider-models", {
      body: { provider: meta.provider },
    });
    setSyncing((t) => ({ ...t, [secretName]: false }));
    if (error) {
      toast({ title: "Error al sincronizar", description: error.message, variant: "destructive" });
    } else if (data?.ok) {
      toast({
        title: `${meta.label}: ${data.count} modelos`,
        description: `Catálogo actualizado. Default: ${data.default_model}`,
      });
    } else {
      toast({
        title: `${meta.label}: no se pudo sincronizar`,
        description: (data?.error ?? "Error desconocido").slice(0, 200),
        variant: "destructive",
      });
    }
    await loadHistory();
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            Mantenimiento de API Keys
          </h1>
          <p className="text-sm text-muted-foreground">
            Estado en vivo de las API keys BYOK usadas por los proveedores externos de IA.
            Los valores nunca se muestran ni se exponen al navegador — solo se verifica que estén configurados.
          </p>
          {checkedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Última verificación: {new Date(checkedAt).toLocaleString("es-MX")}
            </p>
          )}
        </div>
        <Button onClick={() => { load(); loadHistory(); }} variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Actualizar
        </Button>
      </header>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="p-3 text-xs flex gap-2 text-amber-900 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            Por seguridad, las API keys se guardan cifradas como variables de entorno del backend y solo el equipo de
            Lovable puede escribirlas. Usa los botones <em>Configurar</em> / <em>Rotar</em> para copiar la instrucción
            exacta y pegarla en el chat de Lovable; el asistente abrirá el formulario seguro para pegar el valor nuevo.
          </div>
        </CardContent>
      </Card>

      {loading && !secrets.length && (
        <p className="text-sm text-muted-foreground">Consultando estado…</p>
      )}

      <div className="space-y-3">
        {secrets.map((s) => {
          const meta = PROVIDER_META[s.name] ?? { label: s.name, docs: "", where: "", provider: "", prefix: "", length: "" };
          const testStatus = s.last_test_status;
          return (
            <Card key={s.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2">
                    {s.configured ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {meta.label}
                    <Badge variant="outline" className="font-mono text-[10px]">{s.name}</Badge>
                  </span>
                  {s.configured ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">Configurada</Badge>
                  ) : (
                    <Badge variant="destructive">Sin configurar</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Longitud:</span>{" "}
                    <span className="font-mono">{s.length || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vista previa:</span>{" "}
                    <span className="font-mono">{s.preview ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Última acción:</span>{" "}
                    <span>{s.last_action ?? "—"} · {formatRelative(s.last_action_at)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Último test:</span>{" "}
                    {testStatus === "test_success" && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
                        OK · {s.last_test_latency_ms ?? "?"} ms · {formatRelative(s.last_test_at)}
                      </Badge>
                    )}
                    {testStatus === "test_failed" && (
                      <Badge variant="destructive" className="text-[10px]">
                        Error · {formatRelative(s.last_test_at)}
                      </Badge>
                    )}
                    {!testStatus && <span className="text-muted-foreground">nunca</span>}
                  </div>
                </div>
                {s.name === "GEMINI_API_KEY" && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">Auto-test tras guardar/actualizar</p>
                        <p className="text-muted-foreground">
                          Detecto automáticamente cambios en <span className="font-mono">GEMINI_API_KEY</span>
                          {" "}(vía longitud, preview y fecha de última acción) y disparo{" "}
                          <span className="font-mono">test-ai-provider</span> para reportar el estado y la
                          latencia aquí mismo, sin salir de la pantalla.
                        </p>
                        {testing[s.name] && (
                          <p className="text-primary flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Ejecutando auto-test…
                          </p>
                        )}
                        {!testing[s.name] && s.last_test_at && testStatus === "test_success" && (
                          <p className="text-emerald-700 dark:text-emerald-400">
                            Último resultado: <strong>OK</strong> · {s.last_test_latency_ms ?? "?"} ms ·{" "}
                            {formatRelative(s.last_test_at)}
                          </p>
                        )}
                        {!testing[s.name] && s.last_test_at && testStatus === "test_failed" && (
                          <p className="text-destructive">
                            Último resultado: <strong>Falló</strong> · {formatRelative(s.last_test_at)}. Revisa
                            el diagnóstico debajo o presiona “Acabo de actualizar la key”.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={testing[s.name]}
                        onClick={async () => {
                          // Forzar re-detección + auto-test aunque el fingerprint no haya cambiado.
                          fingerprintRef.current["GEMINI_API_KEY"] = "";
                          autoTestedRef.current.delete(
                            fingerprintRef.current["GEMINI_API_KEY"] ?? "",
                          );
                          await load();
                          runTest("GEMINI_API_KEY", { auto: true });
                        }}
                      >
                        {testing[s.name] ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                        )}
                        Acabo de actualizar la key — probar Gemini
                      </Button>
                    </div>
                  </div>
                )}
                {s.last_test_error && testStatus === "test_failed" && (
                  <p className="text-[11px] text-destructive font-mono bg-destructive/5 p-2 rounded border border-destructive/20">
                    {s.last_test_error.slice(0, 300)}
                  </p>
                )}
                {(() => {
                  // Validación: proveedor configurado pero sin catálogo de modelos.
                  // Alerta y sugiere sincronizar o usar "Estándar (auto)".
                  const providerRow = externalProviders?.find((p) => p.id === meta.provider);
                  const emptyModels = !!providerRow && providerRow.models.length === 0;
                  if (!s.configured || !emptyModels) return null;
                  const usingStandard = providerRow?.default_model === "standard";
                  return (
                    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="font-semibold text-amber-900 dark:text-amber-200">
                            Catálogo de modelos vacío para {meta.label}
                          </p>
                          <p className="text-muted-foreground">
                            El proveedor está configurado pero no tiene modelos sincronizados. Las políticas de IA
                            que lo usen no podrán elegir modelo específico.
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-semibold">Recomendación:</span> presiona{" "}
                            <em>Sincronizar modelos</em> para traer el catálogo en vivo, o deja el modelo por
                            defecto en <span className="font-mono">standard</span> (“Estándar (auto)”) para que
                            el endpoint elija automáticamente.
                          </p>
                          {usingStandard && (
                            <p className="text-emerald-700 dark:text-emerald-400">
                              Ya estás usando <span className="font-mono">Estándar (auto)</span> como modelo por defecto.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap pt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => runSync(s.name)}
                          disabled={syncing[s.name]}
                        >
                          {syncing[s.name] ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <ListTree className="h-3.5 w-3.5 mr-1" />
                          )}
                          Sincronizar modelos ahora
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/admin/ai-policies">Abrir políticas de IA</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })()}
                {meta.docs && (
                  <p className="text-xs text-muted-foreground">
                    Obtén tu API key en{" "}
                    <a href={meta.docs} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {meta.where}
                    </a>
                    . Formato esperado: <span className="font-mono">{(meta as any).prefix ?? "—"}</span>.
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const d = diag[s.name];
                    const locked = !!d?.locked;
                    return (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runTest(s.name)}
                        disabled={!s.configured || testing[s.name] || locked}
                        title={locked ? "Deshabilitado por fallo previo. Reactiva el test para reintentar." : undefined}
                      >
                        {testing[s.name] ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Zap className="h-3.5 w-3.5 mr-1" />
                        )}
                        Probar ahora
                      </Button>
                    );
                  })()}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => runSync(s.name)}
                    disabled={!s.configured || syncing[s.name]}
                  >
                    {syncing[s.name] ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <ListTree className="h-3.5 w-3.5 mr-1" />
                    )}
                    Sincronizar modelos
                  </Button>
                  <Button size="sm" variant={s.configured ? "outline" : "default"} onClick={() => copyPrompt(s.name, "configura")}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    {s.configured ? "Copiar instrucción para reconfigurar" : "Copiar instrucción para configurar"}
                  </Button>
                  {s.configured && (
                    <Button size="sm" variant="outline" onClick={() => copyPrompt(s.name, "rota")}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Copiar instrucción para rotar
                    </Button>
                  )}
                </div>
                {diag[s.name] && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="font-semibold text-destructive flex items-center gap-2">
                          Diagnóstico de la prueba
                          {diag[s.name]?.status != null && (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              HTTP {diag[s.name]!.status}
                            </Badge>
                          )}
                          {diag[s.name]?.locked && (
                            <Badge variant="destructive" className="text-[10px]">Bloqueado</Badge>
                          )}
                        </p>
                        <p><span className="font-semibold">Causa probable:</span> {diag[s.name]!.cause}</p>
                        <p><span className="font-semibold">Qué hacer:</span> {diag[s.name]!.hint}</p>
                        <details className="text-muted-foreground">
                          <summary className="cursor-pointer">Mensaje técnico</summary>
                          <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] bg-background/60 p-2 rounded border">
                            {diag[s.name]!.raw}
                          </pre>
                        </details>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runTest(s.name)}
                        disabled={testing[s.name] || diag[s.name]?.locked}
                      >
                        {testing[s.name] ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <RotateCw className="h-3.5 w-3.5 mr-1" />
                        )}
                        Reintentar
                      </Button>
                      {diag[s.name]?.locked && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDiag((prev) => ({
                              ...prev,
                              [s.name]: prev[s.name] ? { ...prev[s.name]!, locked: false } : null,
                            }));
                            toast({
                              title: "Test reactivado",
                              description: "Puedes volver a presionar Probar ahora bajo tu responsabilidad.",
                            });
                          }}
                        >
                          <Power className="h-3.5 w-3.5 mr-1" />
                          Reactivar test
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDiag((prev) => ({ ...prev, [s.name]: null }))}
                      >
                        Descartar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Historial auditado (últimos 50)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <p className="text-sm text-muted-foreground p-4">Cargando…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Sin eventos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Secret</th>
                    <th className="p-2">Acción</th>
                    <th className="p-2">Actor</th>
                    <th className="p-2">Modelo</th>
                    <th className="p-2">Latencia</th>
                    <th className="p-2">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("es-MX")}</td>
                      <td className="p-2 font-mono">{r.secret_name}</td>
                      <td className="p-2">
                        {r.action === "test_success" && <Badge className="bg-emerald-600 hover:bg-emerald-600">OK</Badge>}
                        {r.action === "test_failed" && <Badge variant="destructive">FAIL</Badge>}
                        {r.action === "models_synced" && <Badge className="bg-sky-600 hover:bg-sky-600">SYNC</Badge>}
                        {r.action === "models_sync_failed" && <Badge variant="destructive">SYNC FAIL</Badge>}
                        {!["test_success","test_failed","models_synced","models_sync_failed"].includes(r.action) && (
                          <Badge variant="outline">{r.action}</Badge>
                        )}
                      </td>
                      <td className="p-2">{r.actor_email ?? "—"}</td>
                      <td className="p-2 font-mono">{r.model_used ?? "—"}</td>
                      <td className="p-2">{r.latency_ms != null ? `${r.latency_ms} ms` : "—"}</td>
                      <td className="p-2 max-w-[240px] truncate" title={r.error_message ?? r.note ?? ""}>
                        {r.error_message ?? r.note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Flujo recomendado de rotación</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Genera una nueva key en el panel del proveedor (Google / Mistral / Anthropic).</li>
            <li>Copia la instrucción con el botón <em>Rotar</em> y pégala en el chat de Lovable.</li>
            <li>Pega el nuevo valor en el formulario seguro que abrirá el asistente.</li>
            <li>Vuelve a esta pantalla, presiona <em>Actualizar</em> y luego <em>Probar ahora</em> para validar la key.</li>
            <li>Revoca la key anterior en el panel del proveedor.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
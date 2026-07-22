import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Database, Save, Info } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useAiPolicies,
  useUpdateAiPolicy,
  useAiCacheStats,
  AI_MODEL_CHOICES,
  AI_PROVIDER_CHOICES,
  useExternalProviders,
  modelsForProvider,
  defaultModelForProvider,
  type AiProviderPolicy,
} from "@/hooks/useAiPolicies";

function PolicyRow({ p }: { p: AiProviderPolicy }) {
  const update = useUpdateAiPolicy();
  const { data: externalProviders } = useExternalProviders();
  const [draft, setDraft] = useState({
    provider: p.provider ?? "lovable",
    model: p.model,
    max_output_tokens: p.max_output_tokens,
    history_window: p.history_window,
    enable_cache: p.enable_cache,
    cache_ttl_hours: p.cache_ttl_hours,
  });
  // Re-sync draft if the underlying policy row changes (refetch after save,
  // external mutation, etc.). Prevents stale model/provider combos leaking in.
  useEffect(() => {
    setDraft({
      provider: p.provider ?? "lovable",
      model: p.model,
      max_output_tokens: p.max_output_tokens,
      history_window: p.history_window,
      enable_cache: p.enable_cache,
      cache_ttl_hours: p.cache_ttl_hours,
    });
  }, [p.id, p.provider, p.model, p.max_output_tokens, p.history_window, p.enable_cache, p.cache_ttl_hours]);
  const dirty =
    draft.provider !== (p.provider ?? "lovable") ||
    draft.model !== p.model ||
    draft.max_output_tokens !== p.max_output_tokens ||
    draft.history_window !== p.history_window ||
    draft.enable_cache !== p.enable_cache ||
    draft.cache_ttl_hours !== p.cache_ttl_hours;

  // Modelos disponibles SIEMPRE derivados del proveedor seleccionado.
  // Para `lovable` viene del catálogo interno; para BYOK/externos viene de
  // `ai_external_providers.models` (poblado por `sync-ai-provider-models`).
  const availableModels = modelsForProvider(draft.provider, externalProviders);
  // Cost estimate solo aplica al catálogo interno de Lovable AI.
  const modelMeta =
    draft.provider === "lovable"
      ? AI_MODEL_CHOICES.find((m) => m.value === draft.model)
      : undefined;
  const estCost1k =
    modelMeta
      ? ((modelMeta.inputMicros * 2000 + modelMeta.outputMicros * draft.max_output_tokens) / 1_000_000).toFixed(4)
      : null;
  const providerRow = externalProviders?.find((r) => r.id === draft.provider);
  const modelValid = availableModels.some((m) => m.value === draft.model);
  const providerInactive = draft.provider !== "lovable" && providerRow && !providerRow.activo;
  const canSave =
    dirty &&
    !update.isPending &&
    availableModels.length > 0 &&
    modelValid &&
    !providerInactive;

  const handleProviderChange = (v: string) => {
    setDraft((d) => {
      const nextModel = defaultModelForProvider(v, externalProviders) ?? "";
      return { ...d, provider: v as any, model: nextModel };
    });
  };

  // Si el proveedor seleccionado no tiene modelos sincronizados, forzamos el
  // uso del modelo "Estándar (auto)" automáticamente.
  useEffect(() => {
    if (providerRow && (providerRow.models?.length ?? 0) === 0 && draft.model !== "standard") {
      setDraft((d) => ({ ...d, model: "standard" }));
    }
  }, [providerRow?.models?.length, draft.model]);

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-medium text-sm flex items-center gap-2">
            {p.label}
            <Badge variant="outline" className="text-[10px] font-mono">{p.feature_key}</Badge>
          </div>
          {p.notes && <p className="text-xs text-muted-foreground mt-0.5">{p.notes}</p>}
        </div>
        <Button
          size="sm"
          disabled={!canSave}
          onClick={() => update.mutate({ id: p.id, ...draft })}
        >
          <Save className="h-3.5 w-3.5 mr-1" />Guardar
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div>
          <Label className="text-xs">Proveedor</Label>
          <Select value={draft.provider} onValueChange={handleProviderChange}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AI_PROVIDER_CHOICES.map((pr) => (
                <SelectItem key={pr.value} value={pr.value}>{pr.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Modelo</Label>
          <Select
            key={draft.provider}
            value={modelValid ? draft.model : ""}
            onValueChange={(v) => setDraft((d) => ({ ...d, model: v }))}
            disabled={availableModels.length === 0}
          >
            <SelectTrigger className="h-9">
              <SelectValue
                placeholder={
                  availableModels.length === 0
                    ? "Sin modelos para este proveedor"
                    : `Elegir modelo de ${draft.provider}`
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {availableModels.length === 0 && (
            <p className="text-[10px] text-destructive mt-1">
              Sin modelos configurados para <span className="font-mono">{draft.provider}</span>.
              Sincronízalos en{" "}
              <a href="/admin/api-keys" className="underline">Admin → API Keys</a>{" "}
              (botón “Sincronizar modelos”) o edítalos en{" "}
              <a href="/admin/ai-providers" className="underline">Admin → Proveedores IA</a>.
            </p>
          )}
          {!modelValid && availableModels.length > 0 && (
            <p className="text-[10px] text-amber-600 mt-1">
              El modelo guardado (<span className="font-mono">{draft.model || "—"}</span>) no
              pertenece a <span className="font-mono">{draft.provider}</span>. Elige uno de la lista.
            </p>
          )}
        </div>
        <div>
          <Label className="text-xs">Max output tokens</Label>
          <Input
            type="number" min={100} max={8000} step={100}
            value={draft.max_output_tokens}
            onChange={(e) => setDraft((d) => ({ ...d, max_output_tokens: Number(e.target.value) }))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Historial (mensajes)</Label>
          <Input
            type="number" min={0} max={40}
            value={draft.history_window}
            onChange={(e) => setDraft((d) => ({ ...d, history_window: Number(e.target.value) }))}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-xs">Caché TTL (horas)</Label>
          <Input
            type="number" min={1} max={8760}
            value={draft.cache_ttl_hours}
            onChange={(e) => setDraft((d) => ({ ...d, cache_ttl_hours: Number(e.target.value) }))}
            className="h-9"
            disabled={!draft.enable_cache}
          />
        </div>
      </div>

      {providerInactive && (
        <div className="text-[11px] rounded-md border border-destructive/40 bg-destructive/10 p-2 text-destructive">
          Este proveedor externo está desactivado. Actívalo en{" "}
          <a href="/admin/ai-providers" className="underline font-medium">Admin → Proveedores IA</a>{" "}
          antes de guardar la política.
        </div>
      )}

      {draft.provider !== "lovable" && (
        <div className="text-[11px] rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-amber-900 dark:text-amber-200">
          Proveedor externo (<span className="font-mono">{draft.provider}</span>): los prompts se sanitizan
          (CURP, RFC, email, teléfono, direcciones, fechas y números largos) antes de salir. Cada usuario debe
          otorgar consentimiento explícito en <span className="font-medium">Mis datos y IA</span>. Si el
          consentimiento se revoca o el kill switch está activo, la feature usa automáticamente Lovable AI como
          fallback. Configura la API key del proveedor en{" "}
          <a href="/admin/ai-providers" className="underline font-medium">Admin → Proveedores IA</a>.
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={draft.enable_cache}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, enable_cache: v }))}
          />
          <span className="text-xs">Caché de respuestas educativas genéricas</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {estCost1k
            ? `Costo estimado por request: ~$${estCost1k} USD (2k tokens in + max out)`
            : `Costo gestionado por el proveedor externo (${draft.provider}).`}
        </span>
      </div>
    </div>
  );
}

export function AiPolicyPanel() {
  const { data: policies = [], isLoading } = useAiPolicies();
  const { data: cacheStats = [] } = useAiCacheStats();

  const totalTokensSaved = cacheStats.reduce((s, c) => s + c.tokensSaved, 0);
  const totalHits = cacheStats.reduce((s, c) => s + c.hits, 0);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm">Políticas de IA por feature</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              <Database className="h-3 w-3" />
              {totalHits.toLocaleString("es-MX")} hits de caché
            </Badge>
            <Badge variant="secondary">
              {totalTokensSaved.toLocaleString("es-MX")} tokens ahorrados
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Cada feature elige su modelo, límite de contexto y si activa caché de respuestas educativas.
          Las preguntas con contexto personal (síntomas, mediciones, nombres) nunca se cachean.
        </p>

        {isLoading && <p className="text-xs text-muted-foreground">Cargando políticas…</p>}
        {!isLoading && policies.length === 0 && (
          <p className="text-xs text-muted-foreground">Sin políticas configuradas.</p>
        )}
        <div className="space-y-3">
          {policies.map((p) => <PolicyRow key={p.id} p={p} />)}
        </div>

        {cacheStats.length > 0 && (
          <div className="border-t pt-3">
            <div className="text-xs font-semibold mb-2">Uso de caché por feature</div>
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="text-left py-1">Feature</th>
                  <th className="text-right py-1">Entradas</th>
                  <th className="text-right py-1">Hits</th>
                  <th className="text-right py-1">Tokens ahorrados</th>
                </tr>
              </thead>
              <tbody>
                {cacheStats.map((c) => (
                  <tr key={c.feature_key} className="border-b last:border-0">
                    <td className="py-1 font-mono">{c.feature_key}</td>
                    <td className="text-right py-1 tabular-nums">{c.entries}</td>
                    <td className="text-right py-1 tabular-nums">{c.hits}</td>
                    <td className="text-right py-1 tabular-nums">{c.tokensSaved.toLocaleString("es-MX")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
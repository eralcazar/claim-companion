import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const AI_FEATURES = [
  { key: "kari_chat", label: "Kari (chat clínico)" },
  { key: "activity_coach", label: "Coach de actividad" },
  { key: "glossary", label: "Glosario educativo" },
  { key: "ocr_estudios", label: "OCR de estudios" },
  { key: "ocr_formularios", label: "OCR de formularios aseguradora" },
  { key: "field_mapping", label: "Sugerencia de mapeo de campos" },
] as const;

// ────────────── Proveedor configurado por admin para cada feature ──────────────
export function useAiPolicyProviders() {
  return useQuery({
    queryKey: ["ai_provider_policy", "providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_provider_policy" as any)
        .select("feature_key, provider");
      if (error) throw error;
      const map = new Map<string, string>();
      for (const r of (data ?? []) as any[]) map.set(r.feature_key, r.provider ?? "lovable");
      return map;
    },
  });
}

// ────────────── Kill switch global (admin) ──────────────
export function useExternalProvidersEnabled() {
  return useQuery({
    queryKey: ["ai_settings", "external_providers_enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_settings")
        .select("value")
        .eq("key", "external_providers_enabled")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.value);
    },
  });
}

export function useSetExternalProvidersEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("ai_settings")
        .upsert(
          { key: "external_providers_enabled", value: enabled as any },
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, enabled) => {
      qc.invalidateQueries({ queryKey: ["ai_settings", "external_providers_enabled"] });
      toast({
        title: enabled ? "Proveedores externos activados" : "Kill switch activado",
        description: enabled
          ? "Se permite usar proveedores externos con consentimiento del usuario."
          : "Todos los proveedores externos quedan desactivados. Solo Lovable AI.",
      });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ────────────── Consentimientos por feature (usuario) ──────────────
export type FeatureConsent = {
  id: string;
  user_id: string;
  feature_key: string;
  granted: boolean;
  provider: string;
  created_at: string;
  updated_at: string;
};

export function useMyFeatureConsents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai_feature_consents", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_feature_consents" as any)
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as FeatureConsent[];
    },
  });
}

export function useSetFeatureConsent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { feature_key: string; granted: boolean; provider?: string }) => {
      if (!user?.id) throw new Error("Debes iniciar sesión");
      const { error } = await supabase
        .from("ai_feature_consents" as any)
        .upsert(
          {
            user_id: user.id,
            feature_key: input.feature_key,
            granted: input.granted,
            provider: input.provider ?? "lovable",
          } as any,
          { onConflict: "user_id,feature_key" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["ai_feature_consents"] });
      toast({
        title: vars.granted ? "Consentimiento otorgado" : "Consentimiento revocado",
        description: vars.granted
          ? "Podemos usar IA para esta función."
          : "Se desactivará el uso de IA en esta función de inmediato.",
      });
    },
    onError: (e: any) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ────────────── Auditoría descargable ──────────────
export type AiAuditRow = {
  id: string;
  user_id: string | null;
  feature_key: string;
  provider: string;
  model: string | null;
  sanitized: boolean;
  sanitization_notes: string | null;
  fallback_used: boolean;
  status: string;
  input_chars: number | null;
  output_chars: number | null;
  latency_ms: number | null;
  created_at: string;
  sanitized_prompt: string | null;
  pii_fields_detected: string[] | null;
  blocked_reason: string | null;
  consent_checked: boolean;
};

export function useAiAudit(params: {
  from: string;
  to: string;
  feature?: string;
  provider?: string;
  onlyMine?: boolean;
}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai_provider_audit", params, user?.id],
    queryFn: async () => {
      let q = supabase
        .from("ai_provider_audit" as any)
        .select("*")
        .gte("created_at", params.from)
        .lt("created_at", params.to)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (params.feature) q = q.eq("feature_key", params.feature);
      if (params.provider) q = q.eq("provider", params.provider);
      if (params.onlyMine && user?.id) q = q.eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AiAuditRow[];
    },
  });
}

export function exportAiAuditCSV(rows: AiAuditRow[], from: string, to: string) {
  const header = [
    "fecha",
    "usuario",
    "feature",
    "proveedor",
    "modelo",
    "sanitizado",
    "notas_sanitizacion",
    "campos_pii_detectados",
    "prompt_sanitizado",
    "consentimiento_verificado",
    "razon_bloqueo",
    "fallback",
    "estado",
    "chars_entrada",
    "chars_salida",
    "latencia_ms",
  ];
  const clean = (v: string) => `"${(v ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      [
        new Date(r.created_at).toISOString(),
        r.user_id ?? "",
        r.feature_key,
        r.provider,
        r.model ?? "",
        r.sanitized ? "si" : "no",
        clean(r.sanitization_notes ?? ""),
        clean((r.pii_fields_detected ?? []).join("|")),
        clean(r.sanitized_prompt ?? ""),
        r.consent_checked ? "si" : "no",
        clean(r.blocked_reason ?? ""),
        r.fallback_used ? "si" : "no",
        r.status,
        r.input_chars ?? 0,
        r.output_chars ?? 0,
        r.latency_ms ?? "",
      ].join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `auditoria-ia_${from.slice(0, 10)}_${to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
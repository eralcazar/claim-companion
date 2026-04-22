import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Download, Save } from "lucide-react";
import { getFormDefinition, getAvailableFormats, checkFormatExists } from "@/components/claims/forms/registry";
import FormRenderer from "@/components/claims/forms/FormRenderer";
import DynamicFormRenderer, { useDynamicSections } from "@/components/claims/forms/DynamicFormRenderer";
import AutofillBanner from "@/components/claims/forms/shared/AutofillBanner";
import { downloadPDF } from "@/lib/generateFilledPDF";
import { runClaimPipeline } from "@/lib/claimPipeline";
import { isValidCLABE, isValidCURP, isValidRFC } from "@/components/claims/forms/shared/validators";
import { useEffectiveUserId } from "@/contexts/ImpersonationContext";
import { useFirmas } from "@/hooks/useFirmas";
import { findFormularioByInsurerAndTramite } from "@/lib/generateFilledPDFDynamic";

function fmtValue(v: any): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    if (typeof v[0] === "object") return `${v.length} elemento(s)`;
    return v.join(", ");
  }
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "string" && v.startsWith("data:image")) return "✓ Firma capturada";
  return String(v);
}

export default function NewClaim() {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftQuery = searchParams.get("draft");
  const [tramite, setTramite] = useState<string>("");
  const [policyId, setPolicyId] = useState<string>("");
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({});
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autofilled, setAutofilled] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [formatAvailable, setFormatAvailable] = useState<boolean | null>(null);
  const [generating, setGenerating] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Resolución de formulario dinámico desde BD (campos + secciones)
  const [dynFormularioId, setDynFormularioId] = useState<string | null>(null);
  const [resolvingDyn, setResolvingDyn] = useState(false);

  // Firma electrónica (paso de revisión)
  const { data: firmas = [] } = useFirmas(effectiveUserId);
  const firmaPredeterminada = useMemo(() => firmas.find((f) => f.es_predeterminada) || firmas[0] || null, [firmas]);
  const [firmarElectronicamente, setFirmarElectronicamente] = useState(true);
  const [firmaIdSel, setFirmaIdSel] = useState<string | null>(null);
  useEffect(() => {
    if (!firmaIdSel && firmaPredeterminada) setFirmaIdSel(firmaPredeterminada.id);
  }, [firmaPredeterminada, firmaIdSel]);

  // Cargar borrador desde query param
  useEffect(() => {
    if (!effectiveUserId || !draftQuery || draftLoaded) return;
    (async () => {
      const { data: d, error } = await supabase
        .from("claim_forms")
        .select("*")
        .eq("id", draftQuery)
        .eq("user_id", effectiveUserId)
        .maybeSingle();
      if (error || !d) { toast.error("Borrador no encontrado"); setDraftLoaded(true); return; }
      setDraftId(d.id);
      setTramite((d.tramite_type as string) || "");
      setPolicyId(d.policy_id || "");
      setData((d.data as Record<string, any>) || {});
      setAutofilled(true); // ya tiene datos, no sobreescribir
      setDraftLoaded(true);
      toast.success("Borrador cargado");
    })();
  }, [effectiveUserId, draftQuery, draftLoaded]);

  const { data: policies } = useQuery({
    queryKey: ["policies-active", effectiveUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("user_id", effectiveUserId!)
        .eq("status", "activa");
      return data ?? [];
    },
    enabled: !!effectiveUserId,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", effectiveUserId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", effectiveUserId!).single();
      return data;
    },
    enabled: !!effectiveUserId,
  });

  const policy = useMemo(() => policies?.find((p: any) => p.id === policyId), [policies, policyId]);
  const insurer = (policy?.company || "").toUpperCase();
  const definition = useMemo(
    () => (insurer && tramite ? getFormDefinition(insurer, tramite) : null),
    [insurer, tramite]
  );
  const availableFormats = useMemo(
    () => (insurer ? getAvailableFormats(insurer) : []),
    [insurer]
  );
  const currentFormatLabel = availableFormats.find((f) => f.id === tramite)?.label;

  // Resolver formulario en BD (dinámico) cuando cambian insurer/tramite
  useEffect(() => {
    if (!insurer || !tramite) { setDynFormularioId(null); return; }
    let cancelled = false;
    setResolvingDyn(true);
    findFormularioByInsurerAndTramite(insurer, tramite)
      .then((res) => {
        if (cancelled) return;
        setDynFormularioId(res.formulario && res.campos.length > 0 ? res.formulario.id : null);
      })
      .finally(() => { if (!cancelled) setResolvingDyn(false); });
    return () => { cancelled = true; };
  }, [insurer, tramite]);

  // Secciones dinámicas (sólo si dynFormularioId está set)
  const { sections: dynSections, isLoading: dynLoading, hasFirma } = useDynamicSections(dynFormularioId);
  const useDynamic = !!dynFormularioId && dynSections.length > 0;

  // Pre-check: verificar que el PDF original exista en Storage al elegir formato
  useEffect(() => {
    if (!insurer || !tramite) { setFormatAvailable(null); return; }
    let cancelled = false;
    setFormatAvailable(null);
    checkFormatExists(insurer, tramite).then((ok) => {
      if (cancelled) return;
      setFormatAvailable(ok);
      if (!ok) {
        toast.error(`El formato oficial de ${insurer} (${tramite}) aún no está disponible.`);
      }
    });
    return () => { cancelled = true; };
  }, [insurer, tramite]);

  // Autofill al elegir póliza: solo campos vacíos
  useEffect(() => {
    if (!definition || !policy || !profile || autofilled) return;
    const map = definition.autofill || {};
    const next = { ...data };
    let changed = false;
    for (const [field, source] of Object.entries(map)) {
      if (next[field] != null && next[field] !== "") continue;
      const [origin, key] = source.split(".");
      const src = origin === "policy" ? (policy as any) : (profile as any);
      const v = src?.[key];
      if (v != null && v !== "") {
        next[field] = v;
        changed = true;
      }
    }
    if (changed) setData(next);
    setAutofilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, policy, profile]);

  // Autosave borrador (debounced 1.5s)
  useEffect(() => {
    if (!effectiveUserId || !definition || !policy) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const payload = {
        user_id: effectiveUserId,
        policy_id: policy.id,
        insurer,
        form_code: definition.code,
        tramite_type: tramite,
        data: data as any,
        status: "draft" as const,
      };
      if (draftId) {
        await supabase.from("claim_forms").update(payload).eq("id", draftId);
      } else {
        const { data: ins } = await supabase.from("claim_forms").insert(payload).select("id").single();
        if (ins?.id) setDraftId(ins.id);
      }
    }, 1500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, definition, policy]);

  const onChange = (patch: Record<string, any>) => setData((d) => ({ ...d, ...patch }));

  // Validación de la sección actual: requeridos + tipos especiales
  const validateCurrent = (): boolean => {
    if (!definition) return false;
    const sec = definition.sections[step];
    if (!sec || sec.kind !== "fields") return true;
    for (const f of sec.fields || []) {
      if (f.showWhen && !f.showWhen(data)) continue;
      const v = data[f.name];
      if (f.required && (v == null || v === "" || (Array.isArray(v) && v.length === 0))) return false;
      if (v) {
        if (f.type === "rfc" && !isValidRFC(String(v))) return false;
        if (f.type === "curp" && !isValidCURP(String(v))) return false;
        if (f.type === "clabe" && !isValidCLABE(String(v))) return false;
      }
    }
    return true;
  };

  const handleGenerate = async () => {
    if (!policy || !effectiveUserId) return;
    if (!useDynamic && !definition) return;
    setGenerating(true);
    try {
      const formCode = definition?.code || tramite.slice(0, 3).toUpperCase();
      const result = await runClaimPipeline({
        userId: effectiveUserId,
        insurer,
        formatId: tramite,
        policyId: policy.id,
        formCode,
        data,
        profile,
        policy,
        existingDraftId: draftId,
        firmaId: firmarElectronicamente && (useDynamic ? hasFirma : true) ? firmaIdSel : null,
      });
      downloadPDF(result.pdfBytes, `${result.folio}.pdf`);
      toast.success(`Formato oficial llenado · Folio ${result.folio}`);
      navigate("/reclamos");
    } catch (e: any) {
      console.error("[handleGenerate] error:", e);
      toast.error(e?.message || "Error al generar el PDF. Puedes reintentar desde Reclamos.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!effectiveUserId || !policy || (!useDynamic && !definition)) {
      toast.error("Selecciona aseguradora y trámite");
      return;
    }
    const formCode = definition?.code || tramite.slice(0, 3).toUpperCase();
    const payload = {
      user_id: effectiveUserId,
      policy_id: policy.id,
      insurer,
      form_code: formCode,
      tramite_type: tramite,
      data: data as any,
      status: "draft" as const,
    };
    if (draftId) {
      const { error } = await supabase.from("claim_forms").update(payload).eq("id", draftId);
      if (error) toast.error("Error al guardar"); else toast.success("Borrador guardado");
    } else {
      const { data: ins, error } = await supabase.from("claim_forms").insert(payload).select("id").single();
      if (error) toast.error("Error al guardar"); else { setDraftId(ins.id); toast.success("Borrador guardado"); }
    }
  };

  // Paso 0: selección póliza + formato (no es del FormDefinition)
  if (!definition) {
    return (
      <div className="space-y-6 animate-fade-in max-w-lg mx-auto pb-24">
        <h1 className="font-heading text-2xl font-bold">Nuevo Reclamo</h1>
        <Card>
          <CardHeader><CardTitle className="text-base">Póliza y formato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Póliza</Label>
              <Select
                value={policyId}
                onValueChange={(v) => {
                  setPolicyId(v);
                  setTramite(""); // reset formato al cambiar póliza
                }}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar póliza" /></SelectTrigger>
                <SelectContent>
                  {(policies || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.company} — {p.policy_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Formato a llenar</Label>
              <Select
                value={tramite}
                onValueChange={(v) => setTramite(v)}
                disabled={!policyId || availableFormats.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !policyId
                        ? "Selecciona primero una póliza"
                        : availableFormats.length === 0
                          ? "Sin formatos disponibles"
                          : "Seleccionar formato"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableFormats.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {policyId && availableFormats.length === 0 && (
                <p className="text-xs text-destructive">
                  Esta aseguradora ({insurer}) no tiene formatos cargados.
                </p>
              )}
            </div>
            {tramite && policyId && !getFormDefinition(insurer, tramite) && (
              <p className="text-xs text-destructive">No hay formulario disponible para esta combinación.</p>
            )}
            {tramite && formatAvailable === false && (
              <p className="text-xs text-destructive">
                ⚠️ El PDF oficial no se encontró en Storage. No podrás generar el formato hasta que esté cargado.
              </p>
            )}
            {tramite && formatAvailable === true && (
              <p className="text-xs text-primary">✓ Formato oficial disponible</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections = definition.sections;
  const currentSection = sections[step];
  const isLast = step === sections.length - 1;
  const isReview = step === sections.length; // paso extra de revisión

  // El último "paso" es la revisión; paso permitido [0..sections.length]
  const totalSteps = sections.length + 1;

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto pb-24">
      <h1 className="font-heading text-2xl font-bold">{definition.name}</h1>
      <p className="text-xs text-muted-foreground">{insurer} · {currentFormatLabel || tramite}</p>

      <AutofillBanner />

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="flex items-center gap-1 shrink-0">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${
              i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            {i < totalSteps - 1 && <div className={`h-0.5 w-4 ${i < step ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{step < sections.length ? currentSection.title : "Revisión y generación"}</CardTitle></CardHeader>
        <CardContent>
          {step < sections.length ? (
            <FormRenderer definition={definition} section={currentSection} data={data} onChange={onChange} />
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground text-xs">
                Revisa todos los datos antes de generar el PDF oficial. El folio se asigna automáticamente.
              </p>
              {sections.map((s) => {
                if (s.showWhen && !s.showWhen(data)) return null;
                return (
                  <div key={s.id} className="rounded-md border p-3 space-y-1.5">
                    <p className="font-semibold text-xs text-primary mb-1">{s.title}</p>
                    {s.kind === "dynamic_table" ? (
                      <div className="text-xs">
                        <p className="text-muted-foreground">
                          {((data[s.tableName!] as any[]) || []).length} fila(s)
                        </p>
                        {s.showTotal && (
                          <p className="font-medium mt-1">
                            Total: ${((data[s.tableName!] as any[]) || []).reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    ) : s.kind === "dynamic_doctors" ? (
                      <p className="text-xs text-muted-foreground">
                        {((data[s.doctorsName || "doctors"] as any[]) || []).length} médico(s) registrado(s)
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-1 text-xs">
                        {(s.fields || [])
                          .filter((f) => f.type !== "static_text" && (!f.showWhen || f.showWhen(data)))
                          .map((f) => (
                            <div key={f.name} className="flex justify-between gap-2 border-b border-border/40 py-0.5 last:border-0">
                              <span className="text-muted-foreground shrink-0 max-w-[55%] truncate">{f.label}</span>
                              <span className="font-medium text-right truncate">{fmtValue(data[f.name])}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {step > 0 && (
          <Button variant="outline" className="flex-1 min-w-[120px]" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
        )}
        <Button variant="outline" className="flex-1 min-w-[120px]" onClick={handleSaveDraft}>
          <Save className="h-4 w-4 mr-1" /> Guardar borrador
        </Button>
        {step < sections.length ? (
          <Button className="flex-1 min-w-[120px]" disabled={!validateCurrent()} onClick={() => setStep(step + 1)}>
            Siguiente <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            className="flex-1 min-w-[120px]"
            onClick={handleGenerate}
            disabled={generating || formatAvailable === false}
          >
            <Download className="h-4 w-4 mr-1" />
            {generating ? "Generando..." : "Generar PDF"}
          </Button>
        )}
      </div>
    </div>
  );
}

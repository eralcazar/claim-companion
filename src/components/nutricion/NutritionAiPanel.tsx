import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Bookmark, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AiAnswer, { type AiReference } from "@/components/ai/AiAnswer";
import { Badge } from "@/components/ui/badge";
import {
  useSavedSuggestions, useSaveSuggestion, useUpdateSuggestionStatus, useDeleteSuggestion,
} from "@/hooks/useSavedAiSuggestions";

export function NutritionAiPanel({ patientId }: { patientId?: string }) {
  const [goal, setGoal] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; references: AiReference[]; provider?: string; model?: string } | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const saved = useSavedSuggestions();
  const save = useSaveSuggestion();
  const setStatus = useUpdateSuggestionStatus();
  const del = useDeleteSuggestion();

  async function ask() {
    if (!goal.trim()) { toast.error("Describí un objetivo"); return; }
    setBusy(true); setAnswer(null);
    try {
      const promptComposed = `Objetivo: ${goal}\nRestricciones: ${restrictions || "(ninguna)"}`;
      setLastPrompt(promptComposed);
      const { data, error } = await supabase.functions.invoke("ai-nutrition-suggest", {
        body: { goal, restrictions, patient_id: patientId ?? null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnswer({
        text: (data as any).text ?? "",
        references: (data as any).references ?? [],
        provider: (data as any).provider ?? null,
        model: (data as any).model ?? null,
      });
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo generar la sugerencia");
    } finally {
      setBusy(false);
    }
  }

  async function guardar() {
    if (!answer) return;
    await save.mutateAsync({
      prompt: lastPrompt,
      answer_text: answer.text,
      refs: answer.references,
      provider: answer.provider ?? null,
      model: answer.model ?? null,
    });
  }

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Coach de Nutrición IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Objetivo</Label>
          <Input value={goal} onChange={(e) => setGoal(e.target.value)}
            placeholder="Ej: bajar peso manteniendo masa muscular, hipertensión controlada" />
        </div>
        <div>
          <Label>Restricciones / alergias / condiciones (opcional)</Label>
          <Textarea rows={2} value={restrictions} onChange={(e) => setRestrictions(e.target.value)}
            placeholder="Ej: intolerancia a la lactosa, prediabetes, presión alta" />
        </div>
        <div className="flex justify-end gap-2">
          {answer && (
            <Button variant="outline" onClick={guardar} disabled={save.isPending} className="gap-1">
              <Bookmark className="h-4 w-4" /> Guardar sugerencia
            </Button>
          )}
          <Button onClick={ask} disabled={busy || !goal.trim()} className="gap-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Generando..." : "Generar sugerencia"}
          </Button>
        </div>
        {answer && (
          <div className="rounded-md border bg-muted/30 p-3">
            <AiAnswer text={answer.text} references={answer.references} />
          </div>
        )}
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bookmark className="h-4 w-4" /> Mis sugerencias guardadas
          <Badge variant="outline">{saved.data?.length ?? 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(saved.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no guardaste sugerencias. Generá una y tocá "Guardar sugerencia".</p>
        )}
        {(saved.data ?? []).map((s) => (
          <div key={s.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleString("es-MX")} · {s.provider ?? "gateway"}{s.model ? ` · ${s.model}` : ""}
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={s.status === "follow" ? "default" : s.status === "ignore" ? "secondary" : "outline"}>
                  {s.status === "follow" ? "Siguiendo" : s.status === "ignore" ? "Ignorada" : "Pendiente"}
                </Badge>
                <Button size="sm" variant="ghost" className="gap-1 text-emerald-600"
                  onClick={() => setStatus.mutate({ id: s.id, status: "follow" })}
                  disabled={s.status === "follow"}>
                  <Check className="h-3 w-3" /> Seguir
                </Button>
                <Button size="sm" variant="ghost" className="gap-1 text-amber-600"
                  onClick={() => setStatus.mutate({ id: s.id, status: "ignore" })}
                  disabled={s.status === "ignore"}>
                  <X className="h-3 w-3" /> Ignorar
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive"
                  onClick={() => del.mutate(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Ver prompt</summary>
              <pre className="whitespace-pre-wrap text-[11px] bg-muted/40 p-2 rounded mt-1">{s.prompt}</pre>
            </details>
            <div className="rounded bg-muted/20 p-2">
              <AiAnswer text={s.answer_text} references={s.refs ?? []} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
    </div>
  );
}
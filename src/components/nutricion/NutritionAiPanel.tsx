import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AiAnswer, { type AiReference } from "@/components/ai/AiAnswer";

export function NutritionAiPanel({ patientId }: { patientId?: string }) {
  const [goal, setGoal] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<{ text: string; references: AiReference[] } | null>(null);

  async function ask() {
    if (!goal.trim()) { toast.error("Describí un objetivo"); return; }
    setBusy(true); setAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-nutrition-suggest", {
        body: { goal, restrictions, patient_id: patientId ?? null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnswer({ text: (data as any).text ?? "", references: (data as any).references ?? [] });
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo generar la sugerencia");
    } finally {
      setBusy(false);
    }
  }

  return (
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
        <div className="flex justify-end">
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
  );
}
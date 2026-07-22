import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  exerciseName: string;
  category: string;
  recentSets: Array<{
    fecha?: string;
    reps?: number | null;
    weight_kg?: number | null;
    distance_m?: number | null;
    duration_sec?: number | null;
  }>;
};

type CoachResponse = {
  summary: string;
  progression: string;
  next_target: string;
  cues: string[];
};

export function ExerciseCoachCard({ exerciseName, category, recentSets }: Props) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<CoachResponse | null>(null);

  async function ask() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-exercise-coach", {
        body: {
          exercise_name: exerciseName,
          category,
          recent_sets: recentSets.slice(-10),
        },
      });
      if (error) throw error;
      setAdvice(data as CoachResponse);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo generar la sugerencia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> Coach IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!advice && (
          <>
            <p className="text-sm text-muted-foreground">
              Analizo tus últimas sesiones de <span className="font-medium text-foreground">{exerciseName}</span> y te sugiero cómo progresar.
            </p>
            <Button onClick={ask} disabled={loading || recentSets.length === 0} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Pedir sugerencia
            </Button>
            {recentSets.length === 0 && (
              <p className="text-xs text-muted-foreground">Registrá al menos una sesión para pedir sugerencias.</p>
            )}
          </>
        )}
        {advice && (
          <div className="space-y-3">
            <p className="text-sm">{advice.summary}</p>
            <div className="rounded-md bg-background/60 p-3">
              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                <TrendingUp className="h-4 w-4 text-primary" /> Próxima progresión
              </div>
              <p className="text-sm">{advice.progression}</p>
              <Badge className="mt-2" variant="secondary">Objetivo: {advice.next_target}</Badge>
            </div>
            {advice.cues?.length > 0 && (
              <ul className="text-xs space-y-1 text-muted-foreground list-disc pl-4">
                {advice.cues.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )}
            <Button size="sm" variant="ghost" onClick={ask} disabled={loading}>Volver a analizar</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

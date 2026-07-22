import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Wand2, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PlanRemindersCard } from "@/components/ejercicios/PlanRemindersCard";

const OBJECTIVES = [
  { v: "fuerza", label: "Fuerza" },
  { v: "hipertrofia", label: "Hipertrofia" },
  { v: "resistencia", label: "Resistencia" },
  { v: "perdida_grasa", label: "Pérdida de grasa" },
  { v: "mantenimiento", label: "Mantenimiento" },
];
const LEVELS = [{ v: "principiante", label: "Principiante" }, { v: "intermedio", label: "Intermedio" }, { v: "avanzado", label: "Avanzado" }];
const SCHEMES = [
  { v: "linear", label: "Lineal" },
  { v: "double_progression", label: "Doble progresión" },
  { v: "undulating", label: "Ondulada" },
];

export default function EjerciciosPlan() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [objective, setObjective] = useState("hipertrofia");
  const [level, setLevel] = useState("intermedio");
  const [days, setDays] = useState(3);
  const [weeks, setWeeks] = useState(4);
  const [scheme, setScheme] = useState("linear");
  const [environment, setEnvironment] = useState("gym");
  const [equipment, setEquipment] = useState("barra, mancuernas, poleas");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState<any | null>(null);

  const { data: plans = [] } = useQuery({
    queryKey: ["workout_plans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans" as any)
        .select("*")
        .eq("patient_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  async function generate() {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-workout-plan-generate", {
        body: {
          objective, level, days_per_week: days, weeks,
          progression_scheme: scheme, environment,
          equipment: equipment.split(",").map((s) => s.trim()).filter(Boolean),
          notes,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Plan generado con IA");
      qc.invalidateQueries({ queryKey: ["workout_plans"] });
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo generar");
    } finally {
      setGenerating(false);
    }
  }

  async function adjust(planId: string) {
    setAdjusting(planId);
    setAdjustment(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-workout-plan-adjust", { body: { plan_id: planId } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAdjustment({ planId, ...(data as any) });
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo ajustar");
    } finally {
      setAdjusting(null);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/ejercicios"><ArrowLeft className="h-4 w-4 mr-1" /> Ejercicios</Link></Button>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> Plan semanal con Coach IA</h1>
        <p className="text-sm text-muted-foreground">Define tu objetivo y el Coach IA arma la semana. Puede reajustarlo con tu historial.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Nuevo plan</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <div><Label>Objetivo</Label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OBJECTIVES.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Nivel</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEVELS.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Días por semana</Label><Input type="number" min={1} max={7} value={days} onChange={(e) => setDays(Number(e.target.value) || 3)} /></div>
          <div><Label>Semanas</Label><Input type="number" min={1} max={12} value={weeks} onChange={(e) => setWeeks(Number(e.target.value) || 4)} /></div>
          <div><Label>Progresión</Label>
            <Select value={scheme} onValueChange={setScheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SCHEMES.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Entorno</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gym">Gimnasio</SelectItem>
                <SelectItem value="casa">Casa</SelectItem>
                <SelectItem value="calle">Calle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Equipo disponible (separado por comas)</Label>
            <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="barra, mancuernas, banda elástica" />
          </div>
          <div className="md:col-span-2"><Label>Notas</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: prefiero entrenar de noche, sin salto por rodilla" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={generate} disabled={generating} className="gap-1">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {generating ? "Generando..." : "Generar plan con IA"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Mis planes</h2>
        {plans.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">Aún no generaste un plan.</CardContent></Card>}
        <div className="space-y-3">
          {plans.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {p.objective} · {p.level} · {p.days_per_week}d/sem · {p.weeks} semanas · sem {p.current_week}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.is_active && <Badge variant="secondary">Activo</Badge>}
                    {p.ai_generated && <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> IA</Badge>}
                    <Button size="sm" variant="outline" onClick={() => adjust(p.id)} disabled={adjusting === p.id} className="gap-1">
                      {adjusting === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Ajustar con IA
                    </Button>
                  </div>
                </div>
                {p.notes && <p className="text-sm text-muted-foreground">{p.notes}</p>}
                <PlanRemindersCard planId={p.id} />
                {adjustment?.planId === p.id && (
                  <div className="mt-2 rounded-md border bg-muted/40 p-3 space-y-2 text-sm">
                    <div className="font-medium">Sugerencias del Coach IA</div>
                    {adjustment.summary && <p>{adjustment.summary}</p>}
                    {adjustment.flags?.length > 0 && (
                      <div className="text-amber-600 text-xs">⚠ {adjustment.flags.join(" · ")}</div>
                    )}
                    {adjustment.adjustments?.length > 0 && (
                      <ul className="text-xs space-y-1">
                        {adjustment.adjustments.map((a: any, i: number) => (
                          <li key={i}>Día {a.day_of_week}: <b>{a.action}</b> {a.delta_kg ? `${a.delta_kg}kg` : ""} — {a.reason}</li>
                        ))}
                      </ul>
                    )}
                    {adjustment.next_week_focus && <p className="text-xs italic">Próxima semana: {adjustment.next_week_focus}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
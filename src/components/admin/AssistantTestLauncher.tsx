import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Result = { fn: string; ok: boolean; ms: number; snippet: string };

const ASSISTANTS: { fn: string; label: string; payload: (q: string) => Record<string, unknown> }[] = [
  { fn: "ai-kari-chat", label: "Kari (chat médico)", payload: (q) => ({ message: q }) },
  { fn: "ai-glossary", label: "Glosario médico", payload: (q) => ({ question: q }) },
  { fn: "ai-nutrition-suggest", label: "Sugerencia nutricional", payload: (q) => ({ goal: q, restrictions: "" }) },
];

export function AssistantTestLauncher() {
  const [prompt, setPrompt] = useState("¿Qué es la hipertensión y cómo se previene?");
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);

  const run = async (fn: string, payload: Record<string, unknown>) => {
    setBusy(fn);
    const t0 = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: payload });
      const ms = Math.round(performance.now() - t0);
      if (error) throw error;
      const snippet =
        (data as any)?.answer ??
        (data as any)?.response ??
        (data as any)?.content ??
        JSON.stringify(data).slice(0, 200);
      setResults((r) => [{ fn, ok: true, ms, snippet: String(snippet).slice(0, 200) }, ...r].slice(0, 20));
      toast.success(`${fn}: ${ms}ms`);
    } catch (e: any) {
      const ms = Math.round(performance.now() - t0);
      setResults((r) => [{ fn, ok: false, ms, snippet: e?.message ?? "Error" }, ...r].slice(0, 20));
      toast.error(`${fn}: ${e?.message ?? "Error"}`);
    } finally {
      setBusy(null);
    }
  };

  const runAll = async () => {
    for (const a of ASSISTANTS) await run(a.fn, a.payload(prompt));
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">Probar asistentes y medir consumo</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Ejecuta un mismo prompt contra los asistentes principales. Cada llamada queda registrada en
          <code> ai_token_usage_log</code> con su <code>gateway_log_id</code>, listo para comparar contra el CSV real.
        </p>
        <div>
          <Label className="text-xs">Prompt de prueba</Label>
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} className="h-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {ASSISTANTS.map((a) => (
            <Button
              key={a.fn}
              variant="outline"
              size="sm"
              disabled={!!busy}
              onClick={() => run(a.fn, a.payload(prompt))}
            >
              {busy === a.fn ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              {a.label}
            </Button>
          ))}
          <Button size="sm" disabled={!!busy} onClick={runAll}>
            Ejecutar todos
          </Button>
        </div>
        {results.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            {results.map((r, i) => (
              <div key={i} className="text-xs flex items-start gap-2">
                <span className={`font-mono shrink-0 ${r.ok ? "text-green-600" : "text-destructive"}`}>
                  {r.ok ? "✓" : "✗"} {r.ms}ms
                </span>
                <span className="font-medium shrink-0">{r.fn}:</span>
                <span className="text-muted-foreground truncate">{r.snippet}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, RefreshCw, CheckCircle2, XCircle, Loader2, Copy, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type SecretStatus = {
  name: string;
  configured: boolean;
  length: number;
  preview: string | null;
};

const PROVIDER_META: Record<string, { label: string; docs: string; where: string }> = {
  GEMINI_API_KEY: {
    label: "Google Gemini",
    docs: "https://aistudio.google.com/apikey",
    where: "Google AI Studio → Get API key",
  },
  MISTRAL_API_KEY: {
    label: "Mistral AI",
    docs: "https://console.mistral.ai/api-keys",
    where: "Mistral Console → API Keys",
  },
  ANTHROPIC_API_KEY: {
    label: "Anthropic Claude",
    docs: "https://console.anthropic.com/settings/keys",
    where: "Anthropic Console → API Keys",
  },
};

export default function ApiKeysMaintenance() {
  const { roles } = useAuth();
  const [loading, setLoading] = useState(true);
  const [secrets, setSecrets] = useState<SecretStatus[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("check-ai-secrets");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSecrets(data?.secrets ?? []);
      setCheckedAt(data?.checked_at ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (roles?.includes("admin")) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  if (roles && !roles.includes("admin")) return <Navigate to="/dashboard" replace />;

  const copyPrompt = async (secretName: string, action: "configura" | "rota") => {
    const prompt = `${action === "configura" ? "Configura" : "Rota"} el secret ${secretName} para el proveedor BYOK de IA.`;
    await navigator.clipboard.writeText(prompt);
    toast({
      title: "Instrucción copiada",
      description: "Pégala en el chat de Lovable para abrir el formulario seguro.",
    });
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
        <Button onClick={load} variant="outline" size="sm" disabled={loading}>
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
          const meta = PROVIDER_META[s.name] ?? { label: s.name, docs: "", where: "" };
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
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Longitud:</span>{" "}
                    <span className="font-mono">{s.length || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vista previa:</span>{" "}
                    <span className="font-mono">{s.preview ?? "—"}</span>
                  </div>
                </div>
                {meta.docs && (
                  <p className="text-xs text-muted-foreground">
                    Obtén tu API key en{" "}
                    <a href={meta.docs} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {meta.where}
                    </a>
                    .
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
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
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">Flujo recomendado de rotación</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Genera una nueva key en el panel del proveedor (Google / Mistral / Anthropic).</li>
            <li>Copia la instrucción con el botón <em>Rotar</em> y pégala en el chat de Lovable.</li>
            <li>Pega el nuevo valor en el formulario seguro que abrirá el asistente.</li>
            <li>Vuelve a esta pantalla y presiona <em>Actualizar</em> para confirmar la nueva longitud/preview.</li>
            <li>Revoca la key anterior en el panel del proveedor.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
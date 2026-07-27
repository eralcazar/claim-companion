import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link2, ShieldCheck, Unlink, Loader2, PlugZap, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type MexicoEsLink = {
  id: string;
  mexicoes_user_id: string;
  status: string;
  entitlements: Record<string, unknown> | null;
  linked_at: string;
  revoked_at: string | null;
};

type TestStep = { key: string; label: string; ok: boolean; detail: string };
type TestResult = { ok: boolean; steps: TestStep[]; at: string } | null;

export default function VinculacionMexicoEs() {
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [link, setLink] = useState<MexicoEsLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [result, setResult] = useState<TestResult>(null);

  const isLinked = link?.status === "linked";
  const entitlements = useMemo(
    () => Object.entries((link?.entitlements ?? {}) as Record<string, unknown>),
    [link],
  );

  async function loadLink() {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("mexicoes-bridge", { body: { action: "my_link" } });
    if (!error) setLink((data as { link: MexicoEsLink | null })?.link ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadLink();
  }, []);

  async function handleLink() {
    if (!token.trim()) {
      toast({ title: "Falta el código", description: "Pega el código de vinculación de MexicoEs.", variant: "destructive" });
      return;
    }
    setWorking(true);
    const { data, error } = await supabase.functions.invoke("mexicoes-bridge", {
      body: { action: "link", token: token.trim() },
    });
    setWorking(false);
    const errMsg = (data as { error?: string })?.error ?? error?.message;
    if (errMsg) {
      toast({ title: "No se pudo vincular", description: errMsg, variant: "destructive" });
      return;
    }
    setToken("");
    toast({ title: "Cuenta vinculada", description: "Tu Pasaporte MexicoEs quedó conectado con CareCentral." });
    loadLink();
  }

  async function handleUnlink() {
    setWorking(true);
    await supabase.functions.invoke("mexicoes-bridge", { body: { action: "unlink" } });
    setWorking(false);
    toast({ title: "Vínculo cancelado", description: "Tu cuenta de MexicoEs fue desvinculada." });
    loadLink();
  }

  async function handleTest() {
    setTesting(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("mexicoes-bridge", {
      body: { action: "self_test", simulate_link: simulate },
    });
    setTesting(false);
    const payload = data as { ok?: boolean; steps?: TestStep[]; at?: string; error?: string } | null;
    const errMsg = payload?.error ?? error?.message;
    if (errMsg || !payload?.steps) {
      setResult({ ok: false, steps: [{ key: "error", label: "Prueba fallida", ok: false, detail: errMsg ?? "Sin respuesta del puente" }], at: new Date().toISOString() });
      return;
    }
    setResult({ ok: !!payload.ok, steps: payload.steps, at: payload.at ?? new Date().toISOString() });
    toast({
      title: payload.ok ? "Conexión verificada" : "La prueba encontró problemas",
      description: payload.ok ? "El puente respondió correctamente en todos los pasos." : "Revisa el detalle de cada paso.",
      variant: payload.ok ? "default" : "destructive",
    });
    loadLink();
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" /> Pasaporte MexicoEs
        </h1>
        <p className="text-muted-foreground">
          Conecta tu cuenta de MexicoEs con CareCentral para compartir beneficios y recibir solicitudes médicas
          creadas desde MexicoEs (incluidas escalaciones de 911).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Estado del vínculo
          </CardTitle>
          <CardDescription>Solo tú puedes vincular o desvincular tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : isLinked ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Vinculada</Badge>
                <span className="text-sm text-muted-foreground">
                  Cuenta MexicoEs: <code>{link!.mexicoes_user_id}</code>
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Vinculada el {new Date(link!.linked_at).toLocaleString("es-MX")}
              </p>
              {entitlements.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {entitlements.map(([key, value]) => (
                    <Badge key={key} variant="secondary">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              )}
              <Button variant="destructive" onClick={handleUnlink} disabled={working}>
                <Unlink className="h-4 w-4 mr-2" /> Desvincular
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Badge variant="outline">Sin vincular</Badge>
              <div className="space-y-2">
                <Label htmlFor="token">Código de vinculación</Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Pega aquí el código generado en MexicoEs"
                />
                <p className="text-xs text-muted-foreground">
                  Genera el código desde MexicoEs en “Vincular con CareCentral”. Caduca a los pocos minutos.
                </p>
              </div>
              <Button onClick={handleLink} disabled={working}>
                {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                Vincular cuenta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-primary" /> Probar conexión
          </CardTitle>
          <CardDescription>
            Ejecuta el mismo flujo que usa MexicoEs (firma HMAC, enlace, consulta de estado y sincronización de
            entitlements) y muestra el resultado paso a paso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="simulate">Modo simulado</Label>
              <p className="text-xs text-muted-foreground">
                Genera un token de prueba firmado y crea un vínculo ficticio si aún no tienes uno.
              </p>
            </div>
            <Switch id="simulate" checked={simulate} onCheckedChange={setSimulate} />
          </div>

          <Button onClick={handleTest} disabled={testing} variant="secondary">
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlugZap className="h-4 w-4 mr-2" />}
            Probar conexión
          </Button>

          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={result.ok ? "default" : "destructive"}>
                  {result.ok ? "Todo correcto" : "Con errores"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(result.at).toLocaleString("es-MX")}
                </span>
              </div>
              <ul className="space-y-2">
                {result.steps.map((s) => (
                  <li key={s.key} className="flex items-start gap-2 rounded-md border p-3 text-sm">
                    {s.ok ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                    )}
                    <div>
                      <p className="font-medium">{s.label}</p>
                      <p className="text-xs text-muted-foreground break-all">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

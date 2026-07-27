import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link2, ShieldCheck, Unlink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type MexicoEsLink = {
  id: string;
  mexicoes_user_id: string;
  status: string;
  entitlements: Record<string, unknown> | null;
  linked_at: string;
  revoked_at: string | null;
};

export default function VinculacionMexicoEs() {
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [link, setLink] = useState<MexicoEsLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

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
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";
import { ShieldCheck } from "lucide-react";

// Beta oauth namespace — typed locally so TS compiles.
type OAuthDetails = {
  client?: { name?: string; client_uri?: string; logo_uri?: string };
  redirect_uri?: string;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
};

function isSafeRelative(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Falta authorization_id");
        setChecking(false);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        setChecking(false);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("El servidor de autorización no devolvió una URL de redirección.");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="absolute inset-0 gradient-hero" aria-hidden />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 py-8">
        <div className="flex flex-col items-center gap-2">
          <CareCentralLogo size={80} withText />
        </div>
        <div className="glass-card w-full rounded-3xl p-6 sm:p-8">
          {checking ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="space-y-4">
              <h1 className="font-heading text-xl font-bold text-foreground">
                No se pudo cargar la autorización
              </h1>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/dashboard">Volver al inicio</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-2">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h1 className="font-heading text-lg font-bold text-foreground">
                  Conectar {details?.client?.name ?? "aplicación"} a CareCentral
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {details?.client?.name ?? "La aplicación"} podrá acceder a las herramientas
                de CareCentral mientras tú estés conectado. Solo verá los datos que tu
                cuenta puede ver (se respetan los permisos por rol y RLS).
              </p>
              {details?.scope && (
                <div className="rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">
                  Permisos solicitados:{" "}
                  <span className="font-medium text-foreground">{details.scope}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Esto no evita las políticas de acceso ni el resguardo de datos clínicos de
                CareCentral. Puedes revocar la conexión en cualquier momento.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  disabled={busy}
                  onClick={() => decide(true)}
                  className="h-11 flex-1 rounded-2xl"
                >
                  {busy ? "Conectando..." : "Aprobar y conectar"}
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => decide(false)}
                  variant="outline"
                  className="h-11 flex-1 rounded-2xl"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Keep the helper referenced so tree-shakers keep it if we later reuse for validation.
void isSafeRelative;
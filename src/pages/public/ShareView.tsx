import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, User, Stethoscope, FileText, ShieldCheck, ExternalLink, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CareCentralLogo } from "@/components/brand/CareCentralLogo";

type ShareResult =
  | { ok: true; resource_type: string; data: any; expires_at: string | null }
  | { ok: false; error: string };

const errorLabels: Record<string, string> = {
  not_found: "Este enlace no existe.",
  revoked: "Este enlace fue revocado por su propietario.",
  expired: "Este enlace ha expirado.",
  resource_missing: "El contenido ya no está disponible.",
};

export default function ShareView() {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<ShareResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("resolve_share_token" as any, { _token: decodeURIComponent(token) });
      if (error) {
        setResult({ ok: false, error: "not_found" });
      } else {
        setResult(data as unknown as ShareResult);
      }
      setLoading(false);
    })();
  }, [token]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <CareCentralLogo className="h-8 w-8" />
            <span className="font-semibold">CareCentral</span>
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && result && !result.ok && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Enlace no disponible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{errorLabels[result.error] ?? "No se pudo cargar el enlace."}</p>
              <Button asChild className="mt-4">
                <Link to="/">Ir a CareCentral</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && result && result.ok && (
          <div className="space-y-4">
            <ResourceCard type={result.resource_type} data={result.data} />

            {result.expires_at && (
              <p className="text-center text-xs text-muted-foreground">
                Este enlace expira {format(new Date(result.expires_at), "PPp", { locale: es })}
              </p>
            )}

            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="p-5 space-y-3 text-center">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <ShieldCheck className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">¿Quieres acceso completo a tu expediente?</h3>
                <p className="text-sm text-muted-foreground">
                  Regístrate gratis en CareCentral para guardar tus citas, recetas, estudios y expediente médico en un solo lugar.
                </p>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/login">
                    Crear mi cuenta gratis
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function ResourceCard({ type, data }: { type: string; data: any }) {
  const titleMap: Record<string, string> = {
    appointment: "Cita médica",
    receta: "Receta médica",
    estudio: "Estudio solicitado",
    claim: "Solicitud de seguro",
    format: "Formato de aseguradora",
  };

  return (
    <Card>
      <CardHeader>
        <Badge className="w-fit" variant="secondary">Compartido en CareCentral</Badge>
        <CardTitle>{titleMap[type] ?? "Documento"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {type === "appointment" && (
          <>
            {data.paciente_nombre && (
              <Row icon={<User />} label="Paciente" value={data.paciente_nombre} />
            )}
            {data.fecha && (
              <Row
                icon={<Calendar />}
                label="Fecha y hora"
                value={format(new Date(data.fecha), "PPPP 'a las' p", { locale: es })}
              />
            )}
            {data.medico && <Row icon={<Stethoscope />} label="Médico" value={data.medico} />}
            {data.especialidad && <Row icon={<FileText />} label="Especialidad" value={data.especialidad} />}
            {data.direccion && <Row icon={<MapPin />} label="Dirección" value={data.direccion} />}
          </>
        )}
        {(type === "receta" || type === "estudio") && (
          <>
            {data.folio && <Row icon={<FileText />} label="Folio" value={data.folio} />}
            {data.fecha && (
              <Row
                icon={<Calendar />}
                label="Fecha"
                value={format(new Date(data.fecha), "PPP", { locale: es })}
              />
            )}
            {data.medico && <Row icon={<Stethoscope />} label="Médico" value={data.medico} />}
            {data.paciente_nombre && <Row icon={<User />} label="Paciente" value={data.paciente_nombre} />}
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              El detalle completo (medicamentos, indicaciones y resultados) solo está disponible al iniciar sesión con la cuenta autorizada.
            </p>
          </>
        )}
        {(type === "claim" || type === "format") && (
          <>
            {data.aseguradora && <Row icon={<ShieldCheck />} label="Aseguradora" value={data.aseguradora} />}
            {data.folio && <Row icon={<FileText />} label="Folio" value={data.folio} />}
            {data.tipo && <Row icon={<FileText />} label="Formato" value={data.tipo} />}
            {data.estado && <Row icon={<FileText />} label="Estado" value={data.estado} />}
            {data.fecha && (
              <Row icon={<Calendar />} label="Fecha" value={format(new Date(data.fecha), "PPP", { locale: es })} />
            )}
            {data.paciente_nombre && <Row icon={<User />} label="Paciente" value={data.paciente_nombre} />}
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Para descargar el PDF completo y adjuntar documentos, inicia sesión con la cuenta autorizada.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p>{value}</p>
      </div>
    </div>
  );
}
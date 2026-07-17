import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { usePendingMarketplaceProfiles, useReviewProfile } from "@/hooks/useMyProfessionalProfile";
import { Link } from "react-router-dom";

const TABS = [
  { v: "pendiente", l: "Pendientes" },
  { v: "publicado", l: "Publicados" },
  { v: "rechazado", l: "Rechazados" },
];

export default function MarketplaceReview() {
  useEffect(() => {
    document.title = "Revisión de perfiles | CareCentral";
  }, []);

  const [tab, setTab] = useState("pendiente");
  const { data = [], isLoading } = usePendingMarketplaceProfiles();
  const review = useReviewProfile();
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [motivo, setMotivo] = useState("");
  const [verificado, setVerificado] = useState(false);

  const list = useMemo(() => data.filter((p: any) => p.estado_publicacion === tab), [data, tab]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-semibold">Revisión del marketplace</h1>
        <p className="text-sm text-muted-foreground">Aprueba o rechaza perfiles públicos de especialistas.</p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.v} value={t.v}>
              {t.l} · {data.filter((p: any) => p.estado_publicacion === t.v).length}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-muted-foreground">Sin perfiles en este estado.</p>
      ) : (
        <div className="grid gap-3">
          {list.map((p: any) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {p.display_name}
                      {p.verificado && <Badge className="bg-primary/15 text-primary">Verificado</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {p.tipo} · Cédula {p.cedula_profesional ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/especialista/${p.slug}`} target="_blank">
                        Ver perfil <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.bio && <p className="line-clamp-3 text-muted-foreground">{p.bio}</p>}
                <div className="flex flex-wrap gap-1">
                  {(p.professional_specialties ?? []).map((s: any, i: number) => (
                    <Badge key={i} variant="secondary">{s.specialty?.nombre}</Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(p.professional_locations ?? []).map((l: any, i: number) => (
                    <div key={i}>· {l.ciudad} — {l.direccion}</div>
                  ))}
                </div>
                {p.estado_publicacion === "rechazado" && p.motivo_rechazo && (
                  <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    Motivo: {p.motivo_rechazo}
                  </p>
                )}
                {tab === "pendiente" && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => review.mutate({ id: p.id, decision: "publicado", verificado: true })}
                      disabled={review.isPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Aprobar y verificar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review.mutate({ id: p.id, decision: "publicado", verificado: false })}
                      disabled={review.isPending}
                    >
                      Aprobar sin verificar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => { setRejectTarget(p); setMotivo(""); setVerificado(!!p.verificado); }}
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Rechazar
                    </Button>
                  </div>
                )}
                {tab === "publicado" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: p.id, decision: "publicado", verificado: !p.verificado })}>
                      {p.verificado ? "Quitar verificación" : "Marcar verificado"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setRejectTarget(p); setMotivo(""); }}>
                      Despublicar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rechazar perfil</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Describe qué debe corregir el especialista.</p>
            <Label>Motivo</Label>
            <Textarea rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectTarget || !motivo.trim()) return;
                review.mutate(
                  { id: rejectTarget.id, decision: "rechazado", motivo: motivo.trim() },
                  { onSuccess: () => setRejectTarget(null) },
                );
              }}
              disabled={!motivo.trim() || review.isPending}
            >
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
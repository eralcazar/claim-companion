import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingUp, Plus, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useCompetitorPrices,
  useAddCompetitorPrice,
  usePriceHistory,
  usePriceChangeRequests,
  useCreatePriceChangeRequest,
  useReviewPriceRequest,
} from "@/hooks/usePharmacyPricing";
import { useAuth } from "@/contexts/AuthContext";

function CatalogProduct({ p, canApprove }: { p: any; canApprove: boolean }) {
  const history = usePriceHistory(p.id);
  const competencia = useCompetitorPrices(p.id);
  const addComp = useAddCompetitorPrice();
  const request = useCreatePriceChangeRequest();
  const [openComp, setOpenComp] = useState(false);
  const [openReq, setOpenReq] = useState(false);
  const [comp, setComp] = useState({ competidor: "", precio: "", url: "" });
  const [req, setReq] = useState({ precio: (p.precio_centavos / 100).toFixed(2), razon: "" });

  const chartData = useMemo(
    () =>
      (history.data ?? [])
        .slice()
        .reverse()
        .map((h: any) => ({
          fecha: new Date(h.created_at).toLocaleDateString(),
          precio: h.precio_centavos / 100,
        })),
    [history.data],
  );

  const menorCompetencia = competencia.data?.[0];
  const diff = menorCompetencia ? p.precio_centavos - menorCompetencia.precio_centavos : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{p.nombre}</CardTitle>
            <p className="text-xs text-muted-foreground">{p.presentacion} · SKU {p.sku ?? "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">${(p.precio_centavos / 100).toFixed(2)}</p>
            {p.costo_promedio_centavos ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                costo prom: ${(p.costo_promedio_centavos / 100).toFixed(2)}
              </p>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {chartData.length > 1 ? (
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="fecha" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="precio" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        <div className="text-xs space-y-1">
          <p className="font-medium flex items-center gap-1"><TrendingUp className="h-3 w-3" />Competencia</p>
          {(competencia.data ?? []).slice(0, 3).map((c: any) => (
            <div key={c.id} className="flex justify-between">
              <span>{c.competidor}</span>
              <span className="tabular-nums">${(c.precio_centavos / 100).toFixed(2)}</span>
            </div>
          ))}
          {menorCompetencia ? (
            <Badge variant={diff > 0 ? "destructive" : "default"} className="text-xs">
              {diff > 0 ? `+${(diff / 100).toFixed(2)} más caro` : `${(-diff / 100).toFixed(2)} más barato`}
            </Badge>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Dialog open={openComp} onOpenChange={setOpenComp}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Competencia</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar precio de competencia</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Competidor</Label>
                <Input value={comp.competidor} onChange={(e) => setComp({ ...comp, competidor: e.target.value })} placeholder="Farmacias del Ahorro" />
                <Label>Precio</Label>
                <Input type="number" step="0.01" value={comp.precio} onChange={(e) => setComp({ ...comp, precio: e.target.value })} />
                <Label>URL (opcional)</Label>
                <Input value={comp.url} onChange={(e) => setComp({ ...comp, url: e.target.value })} />
                <Button
                  onClick={async () => {
                    await addComp.mutateAsync({
                      catalog_id: p.id,
                      competidor: comp.competidor,
                      precio_centavos: Math.round(Number(comp.precio) * 100),
                      url: comp.url || undefined,
                    });
                    setOpenComp(false);
                    setComp({ competidor: "", precio: "", url: "" });
                  }}
                >
                  Guardar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={openReq} onOpenChange={setOpenReq}>
            <DialogTrigger asChild><Button size="sm">Solicitar cambio</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Solicitud de cambio de precio</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Nuevo precio</Label>
                <Input type="number" step="0.01" value={req.precio} onChange={(e) => setReq({ ...req, precio: e.target.value })} />
                <Label>Razón</Label>
                <Textarea value={req.razon} onChange={(e) => setReq({ ...req, razon: e.target.value })} />
                <Button
                  onClick={async () => {
                    await request.mutateAsync({
                      catalog_id: p.id,
                      precio_actual_centavos: p.precio_centavos,
                      precio_propuesto_centavos: Math.round(Number(req.precio) * 100),
                      razon: req.razon,
                    });
                    setOpenReq(false);
                  }}
                >
                  Enviar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function PriceRequestsPanel() {
  const { data: reqs = [] } = usePriceChangeRequests();
  const review = useReviewPriceRequest();
  const pendientes = reqs.filter((r: any) => r.estado === "pendiente");
  if (!pendientes.length) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Solicitudes pendientes</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {pendientes.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between gap-2 border rounded p-2">
            <div className="text-sm">
              <p className="font-medium">{r.pharmacy_catalog?.nombre}</p>
              <p className="text-xs text-muted-foreground">
                ${(r.precio_actual_centavos / 100).toFixed(2)} → ${(r.precio_propuesto_centavos / 100).toFixed(2)}
                {r.razon ? ` · ${r.razon}` : ""}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" onClick={() => review.mutate({ id: r.id, approve: true })}>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => review.mutate({ id: r.id, approve: false })}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function PricingManager() {
  const { roles } = useAuth();
  const canApprove = roles.includes("admin") || roles.includes("admin_farmacia");
  const [q, setQ] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["pharmacy_catalog_pricing", q],
    queryFn: async () => {
      let query = supabase
        .from("pharmacy_catalog")
        .select("id, nombre, presentacion, sku, precio_centavos, costo_promedio_centavos")
        .order("nombre")
        .limit(50);
      if (q) query = query.ilike("nombre", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-primary" />Precios y competencia
      </h1>
      <Input placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} />
      {canApprove ? <PriceRequestsPanel /> : null}
      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {products.map((p) => (
            <CatalogProduct key={p.id} p={p} canApprove={canApprove} />
          ))}
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingDown } from "lucide-react";
import { useComparadorPublico } from "@/hooks/usePharmacyPricing";

export default function PharmacyComparator() {
  const params = useParams();
  const [sku, setSku] = useState(params.sku ?? "");
  const [q, setQ] = useState(sku);
  const { data, isLoading } = useComparadorPublico(q || undefined);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <TrendingDown className="h-6 w-6 text-primary" />Comparador de precios
      </h1>
      <form
        onSubmit={(e) => { e.preventDefault(); setQ(sku); }}
        className="flex gap-2"
      >
        <Input placeholder="SKU del producto…" value={sku} onChange={(e) => setSku(e.target.value)} />
        <Button type="submit"><Search className="h-4 w-4 mr-1" />Buscar</Button>
      </form>

      {isLoading ? (
        <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
      ) : data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{data.producto.nombre}</CardTitle>
              <p className="text-sm text-muted-foreground">{data.producto.presentacion} · {data.producto.principio_activo}</p>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-baseline">
                <span className="text-sm">Precio en CareCentral</span>
                <span className="text-3xl font-bold tabular-nums">${(data.producto.precio_centavos / 100).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Competencia</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.competencia.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos de competencia todavía.</p>
              ) : (
                data.competencia.map((c, i) => {
                  const isMenor = c.precio_centavos < data.producto.precio_centavos;
                  return (
                    <div key={i} className="flex items-center justify-between border rounded p-2">
                      <div>
                        <p className="font-medium">{c.competidor}</p>
                        {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">ver origen</a> : null}
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums font-semibold">${(c.precio_centavos / 100).toFixed(2)}</p>
                        <Badge variant={isMenor ? "destructive" : "default"} className="text-xs">
                          {isMenor ? "más barato" : "más caro"}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      ) : q ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Producto no encontrado.</CardContent></Card>
      ) : null}
    </div>
  );
}
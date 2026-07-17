import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ShoppingCart, Search, Plus, Minus, Trash2, LockOpen, Lock, Receipt } from "lucide-react";
import { useActiveBranch } from "@/hooks/usePharmacyBranches";
import { SucursalSelector } from "@/components/pharmacy/SucursalSelector";
import {
  useCurrentPosSession,
  useOpenSession,
  useCloseSession,
  useCreatePosSale,
  useSearchPosCustomers,
  useUpsertPosCustomer,
  type CartLine,
} from "@/hooks/usePosSession";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

function OpenSessionCard({ branchId }: { branchId: string }) {
  const [fondo, setFondo] = useState("500");
  const open = useOpenSession();
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader><CardTitle className="flex items-center gap-2"><LockOpen className="h-5 w-5" />Abrir caja</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Label>Fondo inicial (MXN)</Label>
        <Input type="number" value={fondo} onChange={(e) => setFondo(e.target.value)} />
        <Button className="w-full" onClick={() => open.mutate({ branchId, fondo: Number(fondo) })} disabled={open.isPending}>
          Abrir sesión
        </Button>
      </CardContent>
    </Card>
  );
}

function CloseSessionButton({ sessionId }: { sessionId: string }) {
  const [fondoFinal, setFondoFinal] = useState("");
  const close = useCloseSession();
  const [open, setOpen] = useState(false);
  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}><Lock className="h-4 w-4 mr-1" />Cerrar caja</Button>;
  return (
    <div className="flex gap-1 items-center">
      <Input className="w-32" placeholder="Efectivo final" type="number" value={fondoFinal} onChange={(e) => setFondoFinal(e.target.value)} />
      <Button
        size="sm"
        onClick={async () => {
          const r: any = await close.mutateAsync({ sessionId, fondoFinal: Number(fondoFinal) });
          setOpen(false);
          toast.success(`Diferencia: $${(r?.diferencia / 100).toFixed(2)}`);
        }}
      >
        Confirmar
      </Button>
    </div>
  );
}

export default function Pos() {
  const { branchId } = useActiveBranch();
  const { data: session } = useCurrentPosSession(branchId);
  const sale = useCreatePosSale();

  const [q, setQ] = useState("");
  const { data: results = [] } = useQuery({
    queryKey: ["pos_search", branchId, q],
    enabled: !!branchId && q.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pharmacy_catalog")
        .select("id, nombre, presentacion, precio_centavos, iva_pct, codigo_sat, sku, codigo_barras")
        .or(`nombre.ilike.%${q}%,sku.ilike.%${q}%,codigo_barras.eq.${q}`)
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<{ id?: string; nombre?: string; rfc?: string; email?: string; cp?: string }>({});
  const [reqCfdi, setReqCfdi] = useState(false);
  const [metodo, setMetodo] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [custQ, setCustQ] = useState("");
  const { data: custResults = [] } = useSearchPosCustomers(custQ);
  const upsertCust = useUpsertPosCustomer();

  const addProduct = (p: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.catalog_id === p.id);
      if (idx >= 0) return prev.map((l, i) => (i === idx ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [
        ...prev,
        {
          catalog_id: p.id,
          nombre: p.nombre,
          presentacion: p.presentacion,
          precio_centavos: p.precio_centavos,
          iva_pct: p.iva_pct ?? 16,
          cantidad: 1,
          costo_unitario_centavos: 0,
          codigo_sat: p.codigo_sat,
        },
      ];
    });
    setQ("");
  };

  const total = cart.reduce((s, l) => s + l.precio_centavos * l.cantidad, 0);

  const checkout = async () => {
    if (!branchId) return;
    try {
      await sale.mutateAsync({
        branchId,
        customerId: customer.id,
        cliente_nombre: customer.nombre,
        cliente_rfc: customer.rfc,
        cliente_email: customer.email,
        cliente_cp: customer.cp,
        metodo_pago: metodo,
        requiere_cfdi: reqCfdi,
        lines: cart,
      });
      setCart([]);
      setCustomer({});
      setCustQ("");
    } catch {}
  };

  if (!branchId) {
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <SucursalSelector />
        <Card><CardContent className="p-8 text-center text-muted-foreground">Selecciona una sucursal.</CardContent></Card>
      </div>
    );
  }

  if (!session) return <div className="space-y-4"><SucursalSelector /><OpenSessionCard branchId={branchId} /></div>;

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />POS
        </h1>
        <div className="flex items-center gap-2">
          <SucursalSelector />
          <Badge variant="secondary">Caja abierta · fondo ${(session.fondo_inicial_centavos / 100).toFixed(2)}</Badge>
          <CloseSessionButton sessionId={session.id} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4" />Buscar producto</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Nombre, SKU o código de barras…" value={q} onChange={(e) => setQ(e.target.value)} />
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="w-full text-left border rounded p-2 hover:bg-muted flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">{p.presentacion}</p>
                </div>
                <span className="tabular-nums font-semibold">${(p.precio_centavos / 100).toFixed(2)}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Carrito</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground">Vacío</p>
            ) : (
              cart.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2 border-b pb-2">
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{l.nombre}</p>
                    <p className="text-xs text-muted-foreground">${(l.precio_centavos / 100).toFixed(2)}</p>
                  </div>
                  <Button size="icon" variant="outline" onClick={() => setCart((p) => p.map((x, i) => i === idx ? { ...x, cantidad: Math.max(1, x.cantidad - 1) } : x))}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center tabular-nums">{l.cantidad}</span>
                  <Button size="icon" variant="outline" onClick={() => setCart((p) => p.map((x, i) => i === idx ? { ...x, cantidad: x.cantidad + 1 } : x))}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setCart((p) => p.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}

            <div className="flex justify-between font-bold text-lg pt-2">
              <span>Total</span>
              <span className="tabular-nums">${(total / 100).toFixed(2)}</span>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label>Cliente</Label>
              <Input placeholder="Buscar cliente…" value={custQ} onChange={(e) => { setCustQ(e.target.value); setCustomer({ ...customer, nombre: e.target.value }); }} />
              {custResults.length > 0 && (
                <div className="border rounded max-h-32 overflow-y-auto">
                  {custResults.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => { setCustomer({ id: c.id, nombre: c.nombre, rfc: c.rfc, email: c.email, cp: c.cp }); setCustQ(c.nombre); }}
                      className="w-full text-left p-2 hover:bg-muted text-sm"
                    >
                      {c.nombre} {c.rfc ? <span className="text-muted-foreground">· {c.rfc}</span> : null}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch checked={reqCfdi} onCheckedChange={setReqCfdi} id="cfdi" />
                <Label htmlFor="cfdi" className="flex items-center gap-1"><Receipt className="h-4 w-4" />Requiere factura</Label>
              </div>
              {reqCfdi && (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="RFC" value={customer.rfc ?? ""} onChange={(e) => setCustomer({ ...customer, rfc: e.target.value })} />
                  <Input placeholder="CP" value={customer.cp ?? ""} onChange={(e) => setCustomer({ ...customer, cp: e.target.value })} />
                  <Input className="col-span-2" placeholder="Email" value={customer.email ?? ""} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                </div>
              )}

              <Label>Método de pago</Label>
              <Select value={metodo} onValueChange={(v: any) => setMetodo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>

              <Button className="w-full" size="lg" onClick={checkout} disabled={cart.length === 0 || sale.isPending}>
                Cobrar ${(total / 100).toFixed(2)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
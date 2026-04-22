import { useState } from "react";
import { useCatalog } from "@/hooks/usePharmacy";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, X, ShoppingCart, Search } from "lucide-react";
import { PharmacyCheckoutDialog } from "./PharmacyCheckoutDialog";

interface Props {
  patientId: string;
  recetaId?: string | null;
  triggerLabel?: string;
}

export function CartBuilder({ patientId, recetaId, triggerLabel = "Pagar farmacia" }: Props) {
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, { cantidad: number; nombre: string; precio: number }>>({});
  const { data: items = [] } = useCatalog({ onlyActive: true, q });

  const add = (it: any) => {
    setCart((c) => ({
      ...c,
      [it.id]: { cantidad: (c[it.id]?.cantidad || 0) + 1, nombre: it.nombre, precio: it.precio_centavos },
    }));
  };
  const dec = (id: string) => {
    setCart((c) => {
      const next = { ...c };
      if (!next[id]) return c;
      next[id].cantidad -= 1;
      if (next[id].cantidad <= 0) delete next[id];
      return next;
    });
  };
  const remove = (id: string) => setCart((c) => { const n = { ...c }; delete n[id]; return n; });

  const total = Object.values(cart).reduce((s, i) => s + i.precio * i.cantidad, 0);
  const cartItems = Object.entries(cart).map(([catalog_id, v]) => ({ catalog_id, cantidad: v.cantidad }));

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="default">
        <ShoppingCart className="h-4 w-4 mr-1" />
        {triggerLabel}
      </Button>

      {open && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <h3 className="font-heading font-bold flex-1">Armar pedido</h3>
                <Button size="icon" variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Buscar medicamento" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.nombre}</p>
                      {it.presentacion && <p className="text-xs text-muted-foreground truncate">{it.presentacion}</p>}
                    </div>
                    <span className="text-sm tabular-nums">${(it.precio_centavos / 100).toFixed(2)}</span>
                    <Button size="icon" variant="outline" onClick={() => add(it)}><Plus className="h-3 w-3" /></Button>
                  </div>
                ))}
                {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Sin resultados.</p>}
              </div>

              {cartItems.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Tu carrito</p>
                  {Object.entries(cart).map(([id, v]) => (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{v.nombre}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => dec(id)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center tabular-nums">{v.cantidad}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => add({ id, ...v, precio_centavos: v.precio })}><Plus className="h-3 w-3" /></Button>
                      <span className="w-16 text-right tabular-nums">${((v.precio * v.cantidad) / 100).toFixed(2)}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(id)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <div className="border-t p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold tabular-nums">${(total / 100).toFixed(2)} MXN</p>
              </div>
              <Button disabled={cartItems.length === 0} onClick={() => { setOpen(false); setCheckoutOpen(true); }}>
                Pagar ahora
              </Button>
            </div>
          </Card>
        </div>
      )}

      <PharmacyCheckoutDialog
        open={checkoutOpen}
        onOpenChange={(v) => { setCheckoutOpen(v); if (!v) setCart({}); }}
        patientId={patientId}
        recetaId={recetaId}
        items={cartItems}
      />
    </>
  );
}
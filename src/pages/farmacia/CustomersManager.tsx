import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, User, DollarSign, AlertTriangle, ArrowLeft, Receipt } from "lucide-react";
import {
  usePharmacyCustomers,
  usePharmacyCustomer,
  useCustomerAging,
  useCustomerCharges,
  useCustomerPayments,
  useCustomerOrders,
  useSaveCustomer,
  useRegisterPayment,
  useRegisterCharge,
  formatMxn,
  type PharmacyCustomer,
} from "@/hooks/usePharmacyCustomers";
import { useActiveBranch } from "@/hooks/usePharmacyBranches";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function AgingBadge({ vencido, total }: { vencido: number; total: number }) {
  if (total === 0) return <Badge variant="outline">Sin saldo</Badge>;
  if (vencido === 0) return <Badge className="bg-emerald-600 hover:bg-emerald-700">Al corriente</Badge>;
  if (vencido < total * 0.5) return <Badge className="bg-amber-500 hover:bg-amber-600">Con atraso</Badge>;
  return <Badge variant="destructive">Vencido</Badge>;
}

function CustomerForm({
  initial,
  onDone,
}: {
  initial?: Partial<PharmacyCustomer>;
  onDone: () => void;
}) {
  const save = useSaveCustomer();
  const [form, setForm] = useState<Partial<PharmacyCustomer>>({
    nombre: "",
    telefono: "",
    email: "",
    rfc: "",
    direccion: "",
    ciudad: "",
    estado: "",
    limite_credito_centavos: 0,
    dias_credito: 0,
    activo: true,
    ...initial,
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nombre / Razón social *</Label>
          <Input value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={form.telefono ?? ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>RFC</Label>
          <Input value={form.rfc ?? ""} onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <Label>CP</Label>
          <Input value={form.cp ?? ""} onChange={(e) => setForm({ ...form, cp: e.target.value })} />
        </div>
        <div className="col-span-2">
          <Label>Dirección</Label>
          <Input value={form.direccion ?? ""} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </div>
        <div>
          <Label>Ciudad</Label>
          <Input value={form.ciudad ?? ""} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
        </div>
        <div>
          <Label>Estado</Label>
          <Input value={form.estado ?? ""} onChange={(e) => setForm({ ...form, estado: e.target.value })} />
        </div>
        <div>
          <Label>Límite de crédito (MXN)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={((form.limite_credito_centavos ?? 0) / 100).toFixed(2)}
            onChange={(e) => setForm({ ...form, limite_credito_centavos: Math.round(Number(e.target.value || 0) * 100) })}
          />
        </div>
        <div>
          <Label>Días de crédito</Label>
          <Input
            type="number"
            min={0}
            value={form.dias_credito ?? 0}
            onChange={(e) => setForm({ ...form, dias_credito: Number(e.target.value || 0) })}
          />
        </div>
        <div className="col-span-2">
          <Label>Notas</Label>
          <Textarea value={form.notas ?? ""} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={save.isPending || !form.nombre}
          onClick={async () => {
            await save.mutateAsync(form);
            onDone();
          }}
        >
          Guardar cliente
        </Button>
      </DialogFooter>
    </div>
  );
}

function PaymentDialog({ customerId, saldo, onClose }: { customerId: string; saldo: number; onClose: () => void }) {
  const { data: branch } = useActiveBranch();
  const register = useRegisterPayment();
  const [monto, setMonto] = useState<number>(saldo / 100);
  const [metodo, setMetodo] = useState("efectivo");
  const [ref, setRef] = useState("");
  const [notas, setNotas] = useState("");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Monto (MXN)</Label>
          <Input type="number" min={0.01} step={0.01} value={monto} onChange={(e) => setMonto(Number(e.target.value))} />
          <p className="text-xs text-muted-foreground mt-1">Saldo actual: {formatMxn(saldo)}</p>
        </div>
        <div>
          <Label>Método</Label>
          <Select value={metodo} onValueChange={setMetodo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Referencia</Label>
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Núm. autorización / referencia bancaria" />
        </div>
        <div className="col-span-2">
          <Label>Notas</Label>
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={register.isPending || monto <= 0}
          onClick={async () => {
            await register.mutateAsync({
              customer_id: customerId,
              monto_centavos: Math.round(monto * 100),
              metodo,
              referencia: ref || undefined,
              notas: notas || undefined,
              branch_id: branch?.id ?? null,
            });
            onClose();
          }}
        >
          Registrar abono
        </Button>
      </DialogFooter>
    </div>
  );
}

function ChargeDialog({ customerId, diasCredito, onClose }: { customerId: string; diasCredito: number; onClose: () => void }) {
  const { data: branch } = useActiveBranch();
  const register = useRegisterCharge();
  const [monto, setMonto] = useState(0);
  const [folio, setFolio] = useState("");
  const [notas, setNotas] = useState("");
  const vence = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(0, diasCredito));
    return d.toISOString().slice(0, 10);
  }, [diasCredito]);
  const [venceEl, setVenceEl] = useState(vence);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Monto (MXN)</Label>
          <Input type="number" min={0.01} step={0.01} value={monto} onChange={(e) => setMonto(Number(e.target.value))} />
        </div>
        <div>
          <Label>Vence el</Label>
          <Input type="date" value={venceEl} onChange={(e) => setVenceEl(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Folio / concepto</Label>
          <Input value={folio} onChange={(e) => setFolio(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Notas</Label>
          <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={register.isPending || monto <= 0}
          onClick={async () => {
            await register.mutateAsync({
              customer_id: customerId,
              monto_centavos: Math.round(monto * 100),
              vence_el: venceEl,
              folio: folio || undefined,
              notas: notas || undefined,
              branch_id: branch?.id ?? null,
            });
            onClose();
          }}
        >
          Registrar cargo
        </Button>
      </DialogFooter>
    </div>
  );
}

function CustomerDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: customer } = usePharmacyCustomer(id);
  const { data: aging } = useCustomerAging(id);
  const { data: charges = [] } = useCustomerCharges(id);
  const { data: payments = [] } = useCustomerPayments(id);
  const { data: orders = [] } = useCustomerOrders(id);
  const [payOpen, setPayOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);

  if (!customer) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
        <h2 className="text-xl font-semibold">{customer.nombre}</h2>
        <AgingBadge vencido={aging?.vencido ?? 0} total={aging?.total ?? 0} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo total</p><p className="text-lg font-semibold">{formatMxn(aging?.total ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vencido</p><p className="text-lg font-semibold text-destructive">{formatMxn(aging?.vencido ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Límite de crédito</p><p className="text-lg font-semibold">{formatMxn(customer.limite_credito_centavos)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Próximo vence</p><p className="text-sm font-medium">{aging?.proximo_vence ? format(new Date(aging.proximo_vence), "PPP", { locale: es }) : "—"}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Aging</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-4 gap-3 text-center">
          <div><p className="text-xs text-muted-foreground">0-30 días</p><p className="font-semibold">{formatMxn(aging?.bucket_0_30 ?? 0)}</p></div>
          <div><p className="text-xs text-muted-foreground">31-60 días</p><p className="font-semibold text-amber-600">{formatMxn(aging?.bucket_31_60 ?? 0)}</p></div>
          <div><p className="text-xs text-muted-foreground">61-90 días</p><p className="font-semibold text-orange-600">{formatMxn(aging?.bucket_61_90 ?? 0)}</p></div>
          <div><p className="text-xs text-muted-foreground">+90 días</p><p className="font-semibold text-destructive">{formatMxn(aging?.bucket_90_plus ?? 0)}</p></div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogTrigger asChild><Button><DollarSign className="h-4 w-4 mr-1" /> Registrar abono</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Abono a {customer.nombre}</DialogTitle></DialogHeader>
            <PaymentDialog customerId={customer.id} saldo={aging?.total ?? 0} onClose={() => setPayOpen(false)} />
          </DialogContent>
        </Dialog>
        <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
          <DialogTrigger asChild><Button variant="outline"><Receipt className="h-4 w-4 mr-1" /> Registrar cargo manual</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo cargo</DialogTitle></DialogHeader>
            <ChargeDialog customerId={customer.id} diasCredito={customer.dias_credito} onClose={() => setChargeOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Cargos abiertos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.filter(c => c.saldo_centavos > 0).length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Sin cargos abiertos</TableCell></TableRow>
              )}
              {charges.filter(c => c.saldo_centavos > 0).map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.folio ?? c.id.slice(0, 8)}</TableCell>
                  <TableCell>{format(new Date(c.fecha), "dd/MM/yy")}</TableCell>
                  <TableCell className={new Date(c.vence_el) < new Date() ? "text-destructive font-medium" : ""}>{format(new Date(c.vence_el), "dd/MM/yy")}</TableCell>
                  <TableCell className="text-right">{formatMxn(c.monto_centavos)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatMxn(c.saldo_centavos)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Historial de abonos</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">Sin abonos registrados</TableCell></TableRow>
              )}
              {payments.map(p => (
                <TableRow key={p.id}>
                  <TableCell>{format(new Date(p.fecha), "dd/MM/yy")}</TableCell>
                  <TableCell className="capitalize">{p.metodo}</TableCell>
                  <TableCell className="font-mono text-xs">{p.referencia ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">{formatMxn(p.monto_centavos)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Historial de compras</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">Sin pedidos</TableCell></TableRow>
              )}
              {orders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.folio ?? o.id.slice(0, 8)}</TableCell>
                  <TableCell>{format(new Date(o.created_at), "dd/MM/yy")}</TableCell>
                  <TableCell className="capitalize">{o.tipo}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{o.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-right">{formatMxn(o.total_centavos)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomersManager() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: customers = [], isLoading } = usePharmacyCustomers(search);

  const totals = useMemo(() => {
    const saldo = customers.reduce((a, c) => a + (c.saldo_centavos ?? 0), 0);
    const conSaldo = customers.filter(c => (c.saldo_centavos ?? 0) > 0).length;
    return { saldo, conSaldo };
  }, [customers]);

  if (selectedId) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <CustomerDetail id={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><User className="h-6 w-6" /> Clientes de Farmacia</h1>
          <p className="text-sm text-muted-foreground">Cuentas por cobrar, abonos e historial de compras.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nuevo cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
            <CustomerForm onDone={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Clientes totales</p><p className="text-2xl font-semibold">{customers.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Con saldo pendiente</p><p className="text-2xl font-semibold">{totals.conSaldo}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Cartera total</p><p className="text-2xl font-semibold">{formatMxn(totals.saldo)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, RFC, email o teléfono…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Límite</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">Cargando…</TableCell></TableRow>}
              {!isLoading && customers.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">Sin clientes</TableCell></TableRow>
              )}
              {customers.map((c) => {
                const overLimit = c.limite_credito_centavos > 0 && c.saldo_centavos > c.limite_credito_centavos;
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(c.id)}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{c.rfc ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.telefono ?? c.email ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatMxn(c.limite_credito_centavos)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      <span className={overLimit ? "text-destructive" : ""}>{formatMxn(c.saldo_centavos)}</span>
                      {overLimit && <AlertTriangle className="inline h-3 w-3 ml-1 text-destructive" />}
                    </TableCell>
                    <TableCell>{c.activo ? <Badge variant="outline">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
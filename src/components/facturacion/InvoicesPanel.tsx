import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Printer, Trash2, Receipt } from "lucide-react";
import { useMedicoInvoices, useUpsertInvoice, useDeleteInvoice } from "@/hooks/useMedicoInvoices";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props { mode: "medico" | "paciente"; userId: string }

export function InvoicesPanel({ mode, userId }: Props) {
  const { data: invoices = [] } = useMedicoInvoices(mode === "medico" ? { doctorId: userId } : { patientId: userId });
  const upsert = useUpsertInvoice();
  const del = useDeleteInvoice();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-semibold flex items-center gap-2"><Receipt className="h-5 w-5" />Facturación</h3>
        {mode === "medico" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Nueva factura</Button></DialogTrigger>
            <InvoiceForm doctorId={userId} onSubmit={async (p) => { await upsert.mutateAsync(p); setOpen(false); }} />
          </Dialog>
        )}
      </div>
      <div className="grid gap-3">
        {invoices.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Sin facturas.</CardContent></Card>
        )}
        {invoices.map((inv: any) => (
          <Card key={inv.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-mono">{inv.folio || "Sin folio"}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(new Date(inv.fecha), "d MMM yyyy", { locale: es })} · {inv.concepto}
                  </div>
                  <div className="text-sm font-semibold mt-1">${Number(inv.total).toFixed(2)} MXN</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={inv.estado === "pagada" ? "default" : inv.estado === "cancelada" ? "destructive" : "secondary"}>{inv.estado}</Badge>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => printInvoice(inv)}><Printer className="h-4 w-4" /></Button>
                    {mode === "medico" && (
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(inv.id)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            {mode === "medico" && (
              <CardContent className="pt-0">
                <Select value={inv.estado} onValueChange={(estado) => upsert.mutate({ id: inv.id, estado })}>
                  <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="emitida">Emitida</SelectItem>
                    <SelectItem value="pagada">Pagada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function InvoiceForm({ doctorId, onSubmit }: { doctorId: string; onSubmit: (p: any) => Promise<void> }) {
  const [patientId, setPatientId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [subtotal, setSubtotal] = useState<string>("0");
  const [ivaPct, setIvaPct] = useState<string>("16");
  const [metodo, setMetodo] = useState("efectivo");
  const [rfc, setRfc] = useState("");
  const [razon, setRazon] = useState("");
  const [notas, setNotas] = useState("");

  const subtotalNum = Number(subtotal) || 0;
  const ivaNum = subtotalNum * (Number(ivaPct) || 0) / 100;
  const total = subtotalNum + ivaNum;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Nueva factura</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div><Label>ID paciente (opc.)</Label><Input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="uuid" /></div>
        <div><Label>Concepto</Label><Textarea value={concepto} onChange={(e) => setConcepto(e.target.value)} rows={2} placeholder="Consulta médica general" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Subtotal</Label><Input type="number" step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} /></div>
          <div><Label>IVA %</Label><Input type="number" step="0.01" value={ivaPct} onChange={(e) => setIvaPct(e.target.value)} /></div>
        </div>
        <div className="text-sm text-right">
          <div>IVA: ${ivaNum.toFixed(2)}</div>
          <div className="font-bold">Total: ${total.toFixed(2)} MXN</div>
        </div>
        <div><Label>Método de pago</Label>
          <Select value={metodo} onValueChange={setMetodo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">Efectivo</SelectItem>
              <SelectItem value="transferencia">Transferencia</SelectItem>
              <SelectItem value="tarjeta">Tarjeta</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>RFC receptor (opc.)</Label><Input value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} /></div>
          <div><Label>Razón social</Label><Input value={razon} onChange={(e) => setRazon(e.target.value)} /></div>
        </div>
        <div><Label>Notas</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} /></div>
      </div>
      <DialogFooter>
        <Button disabled={!concepto || subtotalNum <= 0} onClick={() => onSubmit({
          doctor_id: doctorId,
          patient_id: patientId || null,
          concepto, subtotal: subtotalNum, iva: ivaNum, total,
          metodo_pago: metodo,
          rfc_receptor: rfc || null, razon_social_receptor: razon || null,
          notas: notas || null,
          estado: "emitida",
        })}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function printInvoice(inv: any) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`
    <html><head><title>${inv.folio}</title>
    <style>body{font-family:system-ui;padding:40px;max-width:700px;margin:auto;color:#0f172a}
    h1{margin:0 0 4px 0}.muted{color:#64748b;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:24px}
    td,th{padding:8px;border-bottom:1px solid #e2e8f0;text-align:left}
    .total{font-size:18px;font-weight:700;text-align:right;margin-top:16px}
    .header{display:flex;justify-content:space-between;align-items:flex-start}
    </style></head><body>
    <div class="header"><div><h1>Recibo de honorarios</h1><div class="muted">CareCentral</div></div>
    <div style="text-align:right"><div style="font-family:monospace;font-size:14px">${inv.folio}</div>
    <div class="muted">${new Date(inv.fecha).toLocaleDateString("es-MX")}</div></div></div>
    <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0"/>
    ${inv.razon_social_receptor ? `<div><strong>Receptor:</strong> ${inv.razon_social_receptor}</div>` : ""}
    ${inv.rfc_receptor ? `<div class="muted">RFC: ${inv.rfc_receptor}</div>` : ""}
    <table><thead><tr><th>Concepto</th><th style="text-align:right">Importe</th></tr></thead>
    <tbody><tr><td>${escapeHtml(inv.concepto)}</td><td style="text-align:right">$${Number(inv.subtotal).toFixed(2)}</td></tr></tbody></table>
    <div class="total">Subtotal: $${Number(inv.subtotal).toFixed(2)}</div>
    <div class="total">IVA: $${Number(inv.iva).toFixed(2)}</div>
    <div class="total">Total: $${Number(inv.total).toFixed(2)} MXN</div>
    ${inv.metodo_pago ? `<div class="muted" style="margin-top:8px">Método de pago: ${inv.metodo_pago}</div>` : ""}
    ${inv.notas ? `<div style="margin-top:16px"><strong>Notas:</strong><br/>${escapeHtml(inv.notas)}</div>` : ""}
    <script>window.print()</script></body></html>
  `);
  w.document.close();
}

function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
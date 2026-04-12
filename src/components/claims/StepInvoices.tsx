import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { ClaimFormData, Invoice } from "./types";

interface Props {
  form: ClaimFormData;
  onChange: (updates: Partial<ClaimFormData>) => void;
}

const conceptLabels: Record<Invoice["concept"], string> = {
  hospital: "Hospital",
  honorarios: "Honorarios médicos",
  farmacia: "Farmacia",
  otros: "Otros",
};

export default function StepInvoices({ form, onChange }: Props) {
  const addInvoice = () => {
    onChange({
      invoices: [...form.invoices, { number: "", provider: "", amount: "", concept: "hospital" }],
    });
  };

  const updateInvoice = (index: number, updates: Partial<Invoice>) => {
    const updated = form.invoices.map((inv, i) => (i === index ? { ...inv, ...updates } : inv));
    onChange({ invoices: updated });
  };

  const removeInvoice = (index: number) => {
    onChange({ invoices: form.invoices.filter((_, i) => i !== index) });
  };

  const total = form.invoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Facturas y comprobantes</Label>
        <Button size="sm" variant="outline" onClick={addInvoice}>
          <Plus className="h-4 w-4 mr-1" /> Agregar
        </Button>
      </div>

      {form.invoices.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Agrega las facturas de tu reclamo
        </p>
      )}

      {form.invoices.map((inv, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Factura {i + 1}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeInvoice(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">No. Factura</Label>
              <Input
                value={inv.number}
                onChange={(e) => updateInvoice(i, { number: e.target.value })}
                placeholder="5156"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Concepto</Label>
              <Select value={inv.concept} onValueChange={(v) => updateInvoice(i, { concept: v as Invoice["concept"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(conceptLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Proveedor</Label>
              <Input
                value={inv.provider}
                onChange={(e) => updateInvoice(i, { provider: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Importe ($)</Label>
              <Input
                type="number"
                value={inv.amount}
                onChange={(e) => updateInvoice(i, { amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="rounded-lg bg-muted/50 p-3 flex justify-between items-center">
        <span className="font-medium text-sm">Total reclamado</span>
        <span className="font-bold text-lg">${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
      </div>

      <div className="space-y-2">
        <Label>Costo total ($)</Label>
        <Input
          type="number"
          value={form.total_cost || total.toString()}
          onChange={(e) => onChange({ total_cost: e.target.value })}
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

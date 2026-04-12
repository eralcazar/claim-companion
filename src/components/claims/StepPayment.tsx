import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ClaimFormData } from "./types";

interface Props {
  form: ClaimFormData;
  onChange: (updates: Partial<ClaimFormData>) => void;
}

export default function StepPayment({ form, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Método de pago del reembolso</Label>
      <RadioGroup
        value={form.payment_method}
        onValueChange={(v) => onChange({ payment_method: v as ClaimFormData["payment_method"] })}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <RadioGroupItem value="transferencia" id="transfer" />
          <Label htmlFor="transfer" className="flex-1 cursor-pointer">
            <span className="font-medium">Transferencia electrónica</span>
            <span className="block text-xs text-muted-foreground">Depósito directo a tu cuenta</span>
          </Label>
        </div>
        <div className="flex items-center gap-2 rounded-lg border p-3">
          <RadioGroupItem value="cheque" id="cheque" />
          <Label htmlFor="cheque" className="flex-1 cursor-pointer">
            <span className="font-medium">Cheque</span>
            <span className="block text-xs text-muted-foreground">Recoger en oficina</span>
          </Label>
        </div>
      </RadioGroup>

      {form.payment_method === "transferencia" && (
        <div className="space-y-3 animate-fade-in">
          <div className="space-y-2">
            <Label>Nombre de la institución bancaria</Label>
            <Input
              value={form.bank_name}
              onChange={(e) => onChange({ bank_name: e.target.value })}
              placeholder="Ej: BBVA, Banorte, etc."
            />
          </div>
          <div className="space-y-2">
            <Label>CLABE interbancaria (18 dígitos)</Label>
            <Input
              value={form.clabe}
              onChange={(e) => onChange({ clabe: e.target.value.replace(/\D/g, "").slice(0, 18) })}
              placeholder="012320015617061289"
              maxLength={18}
            />
            {form.clabe && form.clabe.length !== 18 && (
              <p className="text-xs text-destructive">La CLABE debe tener 18 dígitos</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

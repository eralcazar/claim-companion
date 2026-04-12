import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ClaimFormData } from "./types";

interface Props {
  form: ClaimFormData;
  onChange: (updates: Partial<ClaimFormData>) => void;
}

export default function StepClaimType({ form, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-medium">¿Qué tipo de reclamo deseas hacer?</Label>
        <div className="grid grid-cols-1 gap-3">
          <Button
            variant={form.claim_type === "reembolso" ? "default" : "outline"}
            className="h-auto py-4 flex flex-col items-start text-left"
            onClick={() => onChange({ claim_type: "reembolso" })}
          >
            <span className="font-semibold">Reembolso</span>
            <span className="text-xs opacity-80">Ya pagaste y quieres que te devuelvan el dinero</span>
          </Button>
          <Button
            variant={form.claim_type === "procedimiento_programado" ? "default" : "outline"}
            className="h-auto py-4 flex flex-col items-start text-left"
            onClick={() => onChange({ claim_type: "procedimiento_programado" })}
          >
            <span className="font-semibold">Procedimiento Programado</span>
            <span className="text-xs opacity-80">Necesitas autorización para un procedimiento o cirugía</span>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-medium">¿Es tu primera reclamación por este padecimiento?</Label>
        <RadioGroup
          value={form.is_initial_claim ? "initial" : "subsequent"}
          onValueChange={(v) => onChange({ is_initial_claim: v === "initial" })}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="initial" id="initial" />
            <Label htmlFor="initial">Sí, primera vez</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="subsequent" id="subsequent" />
            <Label htmlFor="subsequent">No, es complementaria</Label>
          </div>
        </RadioGroup>
        {!form.is_initial_claim && (
          <div className="space-y-2">
            <Label>Número de siniestro anterior</Label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.prior_claim_number}
              onChange={(e) => onChange({ prior_claim_number: e.target.value })}
              placeholder="Ej: 03230232679-07"
            />
          </div>
        )}
      </div>
    </div>
  );
}

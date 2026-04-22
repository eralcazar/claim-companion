import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  indicador: any;
  onSave: (patch: {
    nombre_indicador: string;
    valor: number | null;
    unidad: string | null;
    valor_referencia_min: number | null;
    valor_referencia_max: number | null;
    es_normal: boolean | null;
    flagged: boolean;
  }) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function IndicadorEditRow({ indicador, onSave, onCancel, isSaving }: Props) {
  const [nombre, setNombre] = useState<string>(indicador.nombre_indicador ?? "");
  const [valor, setValor] = useState<string>(indicador.valor != null ? String(indicador.valor) : "");
  const [unidad, setUnidad] = useState<string>(indicador.unidad ?? "");
  const [min, setMin] = useState<string>(
    indicador.valor_referencia_min != null ? String(indicador.valor_referencia_min) : "",
  );
  const [max, setMax] = useState<string>(
    indicador.valor_referencia_max != null ? String(indicador.valor_referencia_max) : "",
  );

  const handleSave = () => {
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      toast.error("El nombre del indicador es obligatorio");
      return;
    }
    const valorNum = valor === "" ? null : Number(valor);
    const minNum = min === "" ? null : Number(min);
    const maxNum = max === "" ? null : Number(max);

    if (valor !== "" && Number.isNaN(valorNum as number)) {
      toast.error("Valor inválido");
      return;
    }
    if (min !== "" && Number.isNaN(minNum as number)) {
      toast.error("Mínimo inválido");
      return;
    }
    if (max !== "" && Number.isNaN(maxNum as number)) {
      toast.error("Máximo inválido");
      return;
    }
    if (minNum != null && maxNum != null && minNum > maxNum) {
      toast.error("El mínimo no puede ser mayor al máximo");
      return;
    }

    const es_normal =
      valorNum != null && minNum != null && maxNum != null
        ? valorNum >= minNum && valorNum <= maxNum
        : null;
    const flagged = es_normal === false;

    onSave({
      nombre_indicador: nombreTrim,
      valor: valorNum,
      unidad: unidad.trim() || null,
      valor_referencia_min: minNum,
      valor_referencia_max: maxNum,
      es_normal,
      flagged,
    });
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="border-b pb-2 pt-1 space-y-2 bg-muted/30 rounded-md px-2">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="col-span-2 md:col-span-1">
          <Label className="text-xs">Indicador</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={handleKey} autoFocus />
        </div>
        <div>
          <Label className="text-xs">Valor</Label>
          <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} onKeyDown={handleKey} />
        </div>
        <div>
          <Label className="text-xs">Unidad</Label>
          <Input value={unidad} onChange={(e) => setUnidad(e.target.value)} onKeyDown={handleKey} />
        </div>
        <div>
          <Label className="text-xs">Min ref.</Label>
          <Input type="number" step="0.01" value={min} onChange={(e) => setMin(e.target.value)} onKeyDown={handleKey} />
        </div>
        <div>
          <Label className="text-xs">Max ref.</Label>
          <Input type="number" step="0.01" value={max} onChange={(e) => setMax(e.target.value)} onKeyDown={handleKey} />
        </div>
      </div>
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isSaving}>
          <X className="h-3.5 w-3.5 mr-1" />Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
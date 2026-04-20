import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Check, X, Trash2 } from "lucide-react";
import type { ProposedField } from "./VisualEditor";

interface Props {
  proposals: ProposedField[];
  selectedKey: string | null;
  saving: boolean;
  onSelect: (key: string | null) => void;
  onUpdate: (key: string, patch: Partial<ProposedField>) => void;
  onAcceptAll: () => void;
  onDiscardAll: () => void;
}

export function ProposalsPanel({
  proposals,
  selectedKey,
  saving,
  onSelect,
  onUpdate,
  onAcceptAll,
  onDiscardAll,
}: Props) {
  const acceptedCount = useMemo(
    () => proposals.filter((p) => p.accepted !== false).length,
    [proposals],
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-warning" />
          <h3 className="font-medium text-sm">Propuestas IA</h3>
        </div>
        <Badge variant="outline">{acceptedCount}/{proposals.length}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Revisa, edita la clave si es necesario y acepta. Las descartadas se eliminan.
      </p>

      <ScrollArea className="h-[400px] pr-2">
        <div className="space-y-2">
          {proposals.map((p) => {
            const isSelected = p.clave === selectedKey;
            const accepted = p.accepted !== false;
            return (
              <div
                key={p.clave}
                className={`rounded border p-2 space-y-1 cursor-pointer transition-colors ${
                  isSelected ? "border-warning bg-warning/5" : "border-border"
                } ${!accepted ? "opacity-50" : ""}`}
                onClick={() => onSelect(p.clave)}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={accepted}
                    onCheckedChange={(v) => onUpdate(p.clave, { accepted: !!v })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Input
                    value={p.clave}
                    onChange={(e) => onUpdate(p.clave, { clave: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-xs font-mono"
                  />
                </div>
                {isSelected && (
                  <Input
                    value={p.etiqueta}
                    onChange={(e) => onUpdate(p.clave, { etiqueta: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-xs"
                    placeholder="Etiqueta"
                  />
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{p.tipo}</span>
                  <span className="font-mono">
                    {p.x.toFixed(1)},{p.y.toFixed(1)} · {p.w.toFixed(1)}×{p.h.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          size="sm"
          className="flex-1"
          onClick={onAcceptAll}
          disabled={saving || acceptedCount === 0}
        >
          <Check className="h-4 w-4" />
          Aceptar {acceptedCount}
        </Button>
        <Button size="sm" variant="outline" onClick={onDiscardAll} disabled={saving}>
          <Trash2 className="h-4 w-4" />
          Descartar
        </Button>
      </div>
    </Card>
  );
}
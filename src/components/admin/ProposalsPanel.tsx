import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Check, X, Trash2 } from "lucide-react";
import type { ProposedField, ProposedSection } from "./VisualEditor";

interface Props {
  proposals: ProposedField[];
  sections?: ProposedSection[];
  selectedKey: string | null;
  saving: boolean;
  onSelect: (key: string | null) => void;
  onUpdate: (key: string, patch: Partial<ProposedField>) => void;
  onAcceptAll: () => void;
  onDiscardAll: () => void;
}

export function ProposalsPanel({
  proposals,
  sections = [],
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
      {sections.length > 0 && (
        <div className="rounded border border-info/30 bg-info/5 p-2 space-y-1">
          <p className="text-[10px] font-medium uppercase text-info">
            Secciones detectadas ({sections.length})
          </p>
          <ul className="text-xs space-y-0.5">
            {sections.map((s) => (
              <li key={`${s.pagina}-${s.nombre}`} className="flex items-center justify-between gap-2">
                <span className="truncate">{s.nombre}</span>
                <Badge variant="outline" className="text-[10px] shrink-0">Pág {s.pagina}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
                  <span className="truncate">
                    {p.tipo} · Pág {p.page}
                    {p.seccion_sugerida ? ` · ${p.seccion_sugerida}` : ""}
                  </span>
                  <span className="font-mono shrink-0">
                    {p.campo.x.toFixed(1)},{p.campo.y.toFixed(1)} · {p.campo.w.toFixed(1)}×{p.campo.h.toFixed(1)}
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
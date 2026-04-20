import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Check, Trash2, Loader2 } from "lucide-react";
import { MappingSelects, type MappingValue } from "./MappingSelects";
import { useMapeos } from "@/hooks/useFormatos";

export type SuggestionRow = {
  campo_id: string;
  clave: string;
  etiqueta: string;
  tabla: "perfil" | "poliza" | "siniestro" | "medico" | "ninguno";
  columna_id: string | null;
  confianza: "alta" | "media" | "baja";
  accepted: boolean;
};

interface Props {
  rows: SuggestionRow[];
  saving: boolean;
  onUpdate: (campo_id: string, patch: Partial<SuggestionRow>) => void;
  onAcceptAll: () => void;
  onDiscardAll: () => void;
}

const CONF_COLOR: Record<SuggestionRow["confianza"], string> = {
  alta: "border-success text-success",
  media: "border-warning text-warning",
  baja: "border-muted-foreground text-muted-foreground",
};

export function MappingSuggestionsPanel({
  rows,
  saving,
  onUpdate,
  onAcceptAll,
  onDiscardAll,
}: Props) {
  const { data: mapeos } = useMapeos();

  const acceptedCount = useMemo(
    () => rows.filter((r) => r.accepted && r.tabla !== "ninguno" && r.columna_id).length,
    [rows],
  );

  const toMappingValue = (r: SuggestionRow): MappingValue => ({
    perfil: r.tabla === "perfil" ? r.columna_id : null,
    poliza: r.tabla === "poliza" ? r.columna_id : null,
    siniestro: r.tabla === "siniestro" ? r.columna_id : null,
    medico: r.tabla === "medico" ? r.columna_id : null,
  });

  const fromMappingValue = (v: MappingValue): { tabla: SuggestionRow["tabla"]; columna_id: string | null } => {
    if (v.perfil) return { tabla: "perfil", columna_id: v.perfil };
    if (v.poliza) return { tabla: "poliza", columna_id: v.poliza };
    if (v.siniestro) return { tabla: "siniestro", columna_id: v.siniestro };
    if (v.medico) return { tabla: "medico", columna_id: v.medico };
    return { tabla: "ninguno", columna_id: null };
  };

  const labelForColumn = (r: SuggestionRow) => {
    if (!r.columna_id || r.tabla === "ninguno" || !mapeos) return "—";
    const list =
      r.tabla === "perfil" ? mapeos.perfiles
      : r.tabla === "poliza" ? mapeos.polizas
      : r.tabla === "siniestro" ? mapeos.siniestros
      : mapeos.medicos;
    return list?.find((o) => o.id === r.columna_id)?.nombre_display ?? r.columna_id;
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-warning" />
          <h3 className="font-medium text-sm">Sugerencias de mapeo IA</h3>
        </div>
        <Badge variant="outline">{acceptedCount}/{rows.length}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Revisa cada sugerencia, ajústala si es necesario y aplica el mapeo a los campos.
      </p>

      <ScrollArea className="h-[420px] pr-2">
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.campo_id}
              className={`rounded border p-2 space-y-2 ${
                r.accepted ? "border-border" : "border-border opacity-50"
              }`}
            >
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={r.accepted}
                  onCheckedChange={(v) => onUpdate(r.campo_id, { accepted: !!v })}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] truncate">{r.clave}</span>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${CONF_COLOR[r.confianza]}`}>
                      {r.confianza}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{r.etiqueta}</p>
                </div>
              </div>
              <div className="pl-6 space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wide">
                  Sugerencia: <span className="text-foreground normal-case">{r.tabla === "ninguno" ? "Sin mapeo" : `${r.tabla} · ${labelForColumn(r)}`}</span>
                </p>
                <MappingSelects
                  value={toMappingValue(r)}
                  onChange={(v) => onUpdate(r.campo_id, fromMappingValue(v))}
                />
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Sin sugerencias.
            </p>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          size="sm"
          className="flex-1"
          onClick={onAcceptAll}
          disabled={saving || acceptedCount === 0}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Aplicar {acceptedCount}
        </Button>
        <Button size="sm" variant="outline" onClick={onDiscardAll} disabled={saving}>
          <Trash2 className="h-4 w-4" />
          Descartar
        </Button>
      </div>
    </Card>
  );
}
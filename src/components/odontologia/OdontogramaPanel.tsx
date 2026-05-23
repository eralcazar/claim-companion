import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ODONT_ESTADOS, useOdontograma, useSetToothState } from "@/hooks/useOdontograma";

// FDI: cuadrantes 1-4 (permanentes adultos). Pieza = cuadrante*10 + nro (1..8 desde línea media)
const QUADRANTS = [
  { q: 1, label: "Sup. derecho", row: "top", side: "right" },
  { q: 2, label: "Sup. izquierdo", row: "top", side: "left" },
  { q: 4, label: "Inf. derecho", row: "bottom", side: "right" },
  { q: 3, label: "Inf. izquierdo", row: "bottom", side: "left" },
];
const SURFACES = [
  { code: "O", label: "Oclusal" },
  { code: "M", label: "Mesial" },
  { code: "D", label: "Distal" },
  { code: "V", label: "Vestibular" },
  { code: "L", label: "Lingual" },
];

interface Props { patientId: string; canEdit?: boolean }

export function OdontogramaPanel({ patientId, canEdit = true }: Props) {
  const { data: states = [] } = useOdontograma(patientId, true);
  const setState = useSetToothState();
  const [selected, setSelected] = useState<{ pieza: number; superficie: string | null } | null>(null);

  const byKey = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of states) m.set(`${s.pieza}|${s.superficie ?? ""}`, s);
    return m;
  }, [states]);

  const piecesByQuadrant = (q: number) => {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8];
    return (q === 1 || q === 4) ? [...nums].reverse() : nums;
  };

  const renderTooth = (q: number, n: number) => {
    const pieza = q * 10 + n;
    const main = byKey.get(`${pieza}|`);
    const color = main?.color ?? "#e2e8f0";
    const hasSurfaces = SURFACES.some((s) => byKey.has(`${pieza}|${s.code}`));
    return (
      <button
        key={pieza}
        onClick={() => canEdit && setSelected({ pieza, superficie: null })}
        className="relative w-9 h-12 rounded border border-border flex flex-col items-center justify-end text-[10px] font-mono hover:ring-2 hover:ring-primary transition"
        style={{ background: color, color: getContrastText(color) }}
        title={`Pieza ${pieza}${main?.estado ? " · " + main.estado : ""}`}
      >
        {hasSurfaces && <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
        <span>{pieza}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-heading font-semibold">Odontograma</h3>
        <div className="flex flex-wrap gap-1">
          {ODONT_ESTADOS.map((e) => (
            <Badge key={e.value} variant="outline" className="gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />{e.label}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="py-6 space-y-4">
          {/* Superior */}
          <div className="flex justify-center gap-1">
            {piecesByQuadrant(1).map((n) => renderTooth(1, n))}
            <div className="w-2" />
            {piecesByQuadrant(2).map((n) => renderTooth(2, n))}
          </div>
          <div className="border-t border-dashed" />
          {/* Inferior */}
          <div className="flex justify-center gap-1">
            {piecesByQuadrant(4).map((n) => renderTooth(4, n))}
            <div className="w-2" />
            {piecesByQuadrant(3).map((n) => renderTooth(3, n))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Numeración FDI. Haz click en una pieza para registrar estado o superficie específica.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <ToothEditor
            pieza={selected.pieza}
            current={byKey.get(`${selected.pieza}|`)}
            surfaceStates={SURFACES.map((s) => ({ ...s, state: byKey.get(`${selected.pieza}|${s.code}`) }))}
            canEdit={canEdit}
            onSave={async (payload) => { await setState.mutateAsync({ patient_id: patientId, ...payload }); setSelected(null); }}
          />
        )}
      </Dialog>
    </div>
  );
}

function ToothEditor({ pieza, current, surfaceStates, canEdit, onSave }: any) {
  const [estado, setEstado] = useState(current?.estado ?? "sano");
  const [superficie, setSuperficie] = useState<string | "">("");
  const [notas, setNotas] = useState("");
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Pieza {pieza}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Superficie (opcional)</Label>
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => setSuperficie("")}
              className={`px-3 py-1.5 rounded text-xs border ${superficie === "" ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>Toda la pieza</button>
            {SURFACES.map((s) => (
              <button key={s.code} type="button" onClick={() => setSuperficie(s.code)}
                className={`px-3 py-1.5 rounded text-xs border ${superficie === s.code ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Estado</Label>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {ODONT_ESTADOS.map((e) => (
              <button key={e.value} type="button" onClick={() => setEstado(e.value)}
                className={`p-2 rounded border text-xs flex items-center gap-1.5 ${estado === e.value ? "ring-2 ring-primary" : ""}`}
                style={{ background: e.color, color: getContrastText(e.color) }}>
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <div><Label>Notas</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} /></div>
        {surfaceStates.some((s: any) => s.state) && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Superficies registradas: {surfaceStates.filter((s: any) => s.state).map((s: any) => `${s.label}=${s.state.estado}`).join(", ")}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button disabled={!canEdit} onClick={() => onSave({ pieza, superficie: superficie || null, estado, notas })}>Guardar</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function getContrastText(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#0f172a" : "#ffffff";
}
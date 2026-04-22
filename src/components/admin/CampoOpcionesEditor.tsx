import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export interface CampoOpcion {
  valor: string;
  etiqueta: string;
  campo_pagina?: number | null;
  campo_x?: number | null;
  campo_y?: number | null;
  campo_ancho?: number | null;
  campo_alto?: number | null;
}

interface Props {
  opciones: CampoOpcion[];
  defaultPagina?: number | null;
  onChange: (next: CampoOpcion[]) => void;
}

/**
 * Sub-editor de opciones para campos tipo radio/checkbox/select.
 * Cada opción puede tener sus propias coordenadas en el PDF para que al
 * marcarse en el wizard se estampe la "X" en el lugar correcto.
 */
export function CampoOpcionesEditor({ opciones, defaultPagina, onChange }: Props) {
  const update = (idx: number, patch: Partial<CampoOpcion>) => {
    const next = opciones.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const remove = (idx: number) => {
    const next = opciones.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const add = () => {
    onChange([
      ...opciones,
      {
        valor: "",
        etiqueta: "",
        campo_pagina: defaultPagina ?? 1,
        campo_x: null,
        campo_y: null,
        campo_ancho: 1.5,
        campo_alto: 1.5,
      },
    ]);
  };

  const numField = (v: number | null | undefined) => (v ?? "");
  const parseNum = (s: string) => (s.trim() === "" ? null : Number(s));

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          Opciones ({opciones.length})
        </p>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-3 w-3 mr-1" /> Agregar opción
        </Button>
      </div>
      {opciones.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">
          Sin opciones. Agrega al menos una con coordenadas para que se estampe
          la marca al seleccionarse.
        </p>
      )}
      {opciones.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left px-1 py-1 font-medium">Valor</th>
                <th className="text-left px-1 py-1 font-medium">Etiqueta</th>
                <th className="text-left px-1 py-1 font-medium w-14">Pág</th>
                <th className="text-left px-1 py-1 font-medium w-16">X%</th>
                <th className="text-left px-1 py-1 font-medium w-16">Y%</th>
                <th className="text-left px-1 py-1 font-medium w-14">W%</th>
                <th className="text-left px-1 py-1 font-medium w-14">H%</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {opciones.map((o, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-1 py-1">
                    <Input
                      value={o.valor}
                      onChange={(e) => update(i, { valor: e.target.value })}
                      className="h-7 text-xs font-mono"
                      placeholder="valor"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      value={o.etiqueta}
                      onChange={(e) => update(i, { etiqueta: e.target.value })}
                      className="h-7 text-xs"
                      placeholder="Etiqueta visible"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={numField(o.campo_pagina)}
                      onChange={(e) => update(i, { campo_pagina: parseNum(e.target.value) })}
                      className="h-7 text-xs px-1"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(o.campo_x)}
                      onChange={(e) => update(i, { campo_x: parseNum(e.target.value) })}
                      className="h-7 text-xs px-1 font-mono"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(o.campo_y)}
                      onChange={(e) => update(i, { campo_y: parseNum(e.target.value) })}
                      className="h-7 text-xs px-1 font-mono"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(o.campo_ancho)}
                      onChange={(e) => update(i, { campo_ancho: parseNum(e.target.value) })}
                      className="h-7 text-xs px-1 font-mono"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={numField(o.campo_alto)}
                      onChange={(e) => update(i, { campo_alto: parseNum(e.target.value) })}
                      className="h-7 text-xs px-1 font-mono"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
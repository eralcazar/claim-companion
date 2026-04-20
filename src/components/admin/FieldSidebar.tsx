import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy } from "lucide-react";
import type { Campo } from "@/hooks/useFormatos";
import { MappingSelects, type MappingValue } from "./MappingSelects";

const TIPOS = ["texto", "numero", "fecha", "checkbox", "firma", "email", "telefono"];

interface Props {
  campo: Campo | null;
  totalEnPagina: number;
  totalEnFormulario: number;
  onChange: (patch: Partial<Campo>) => void;
  onCommit: (patch: Partial<Campo>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function FieldSidebar({
  campo,
  totalEnPagina,
  totalEnFormulario,
  onChange,
  onCommit,
  onDelete,
  onDuplicate,
}: Props) {
  if (!campo) {
    return (
      <Card className="p-4 space-y-3 text-sm">
        <h3 className="font-semibold">Sin selección</h3>
        <div className="text-muted-foreground space-y-1 text-xs">
          <p>Campos en esta página: <strong className="text-foreground">{totalEnPagina}</strong></p>
          <p>Campos en el formulario: <strong className="text-foreground">{totalEnFormulario}</strong></p>
        </div>
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-medium">Leyenda</p>
          <div className="flex items-center gap-2 text-xs">
            <div className="h-3 w-3 border-2 border-emerald-500 bg-emerald-500/10 rounded-sm" />
            <span>Mapeado</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="h-3 w-3 border-2 border-primary bg-primary/10 rounded-sm" />
            <span>Manual</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t">
          Click en una caja para seleccionarla, o activa <strong>Nuevo campo</strong> y arrastra sobre el PDF para crear uno.
        </p>
      </Card>
    );
  }

  const mapping: MappingValue = {
    perfil: campo.mapeo_perfil,
    poliza: campo.mapeo_poliza,
    siniestro: campo.mapeo_siniestro,
  };

  const hasMapping = !!(campo.mapeo_perfil || campo.mapeo_poliza || campo.mapeo_siniestro);

  return (
    <Card className="p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Campo seleccionado</h3>
        <Badge variant={hasMapping ? "default" : "secondary"} className="text-[10px]">
          {hasMapping ? "⚡ Mapeado" : "○ Manual"}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Clave</Label>
        <Input
          className="h-8 font-mono text-xs"
          value={campo.clave}
          onChange={(e) => onChange({ clave: e.target.value })}
          onBlur={(e) => onCommit({ clave: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Etiqueta</Label>
        <Input
          className="h-8 text-xs"
          value={campo.etiqueta ?? ""}
          onChange={(e) => onChange({ etiqueta: e.target.value })}
          onBlur={(e) => onCommit({ etiqueta: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Tipo</Label>
        <Select
          value={campo.tipo}
          onValueChange={(v) => onCommit({ tipo: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Mapeo</Label>
        <MappingSelects
          value={mapping}
          onChange={(v) =>
            onCommit({
              mapeo_perfil: v.perfil,
              mapeo_poliza: v.poliza,
              mapeo_siniestro: v.siniestro,
            })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumField
          label="Página"
          value={campo.campo_pagina ?? 1}
          onCommit={(v) => onCommit({ campo_pagina: v })}
        />
        <div className="flex items-center justify-between rounded-md border px-2 h-8">
          <Label htmlFor="req" className="text-xs">Requerido</Label>
          <Switch
            id="req"
            checked={campo.requerido}
            onCheckedChange={(v) => onCommit({ requerido: v })}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <NumField label="X%" value={campo.campo_x ?? 0} onCommit={(v) => onCommit({ campo_x: v })} step={0.1} />
        <NumField label="Y%" value={campo.campo_y ?? 0} onCommit={(v) => onCommit({ campo_y: v })} step={0.1} />
        <NumField label="W%" value={campo.campo_ancho ?? 0} onCommit={(v) => onCommit({ campo_ancho: v })} step={0.1} />
        <NumField label="H%" value={campo.campo_alto ?? 0} onCommit={(v) => onCommit({ campo_alto: v })} step={0.1} />
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onDuplicate} className="flex-1">
          <Copy className="h-3 w-3" />
          Duplicar
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete} className="flex-1">
          <Trash2 className="h-3 w-3" />
          Eliminar
        </Button>
      </div>
    </Card>
  );
}

function NumField({
  label,
  value,
  onCommit,
  step = 1,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        className="h-8 text-xs"
        defaultValue={value}
        key={value}
        onBlur={(e) => onCommit(Number(e.target.value))}
      />
    </div>
  );
}
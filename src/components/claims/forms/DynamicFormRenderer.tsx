import { useMemo } from "react";
import { useCampos, useSecciones, type Campo } from "@/hooks/useFormatos";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SignaturePicker from "./shared/SignaturePicker";

export interface DynamicSection {
  id: string;
  nombre: string;
  campos: Campo[];
}

/** Devuelve las secciones agrupadas (incluye una "Sin sección" si aplica). */
export function useDynamicSections(formularioId: string | null) {
  const { data: campos = [], isLoading: loadingCampos } = useCampos(formularioId);
  const { data: secciones = [], isLoading: loadingSecs } = useSecciones(formularioId);

  const grouped = useMemo<DynamicSection[]>(() => {
    const out: DynamicSection[] = [];
    const camposPorSeccion = new Map<string, Campo[]>();
    const sinSeccion: Campo[] = [];
    for (const c of campos) {
      if (c.seccion_id) {
        const arr = camposPorSeccion.get(c.seccion_id) || [];
        arr.push(c);
        camposPorSeccion.set(c.seccion_id, arr);
      } else {
        sinSeccion.push(c);
      }
    }
    for (const s of secciones) {
      const list = (camposPorSeccion.get(s.id) || []).sort((a, b) => a.orden - b.orden);
      if (list.length === 0) continue;
      out.push({ id: s.id, nombre: s.nombre, campos: list });
    }
    if (sinSeccion.length > 0) {
      out.push({
        id: "__none__",
        nombre: "Otros campos",
        campos: sinSeccion.sort((a, b) => a.orden - b.orden),
      });
    }
    return out;
  }, [campos, secciones]);

  return { sections: grouped, isLoading: loadingCampos || loadingSecs, hasFirma: campos.some((c) => c.tipo === "firma") };
}

interface Props {
  section: DynamicSection;
  data: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}

export default function DynamicFormRenderer({ section, data, onChange }: Props) {
  return (
    <div className="space-y-4">
      {section.campos.map((c) => (
        <DynamicField key={c.id} campo={c} data={data} onChange={onChange} />
      ))}
    </div>
  );
}

function DynamicField({
  campo,
  data,
  onChange,
}: {
  campo: Campo;
  data: Record<string, any>;
  onChange: (patch: Record<string, any>) => void;
}) {
  const value = data[campo.clave];
  const set = (v: any) => onChange({ [campo.clave]: v });

  const opciones: Array<{ valor: string; etiqueta: string }> = Array.isArray(campo.opciones)
    ? (campo.opciones as any[]).map((o: any) =>
        typeof o === "string"
          ? { valor: o, etiqueta: o }
          : { valor: o.valor ?? o.value ?? "", etiqueta: o.etiqueta ?? o.label ?? o.valor ?? "" }
      )
    : [];

  const label = (
    <Label className="text-xs font-medium">
      {campo.etiqueta || campo.clave}
      {campo.requerido && <span className="text-destructive ml-1">*</span>}
    </Label>
  );

  switch (campo.tipo) {
    case "textarea":
      return (
        <div className="space-y-1.5">
          {label}
          <Textarea
            value={value ?? ""}
            onChange={(e) => set(e.target.value)}
            maxLength={campo.longitud_max ?? undefined}
            rows={3}
          />
        </div>
      );
    case "numero":
      return (
        <div className="space-y-1.5">
          {label}
          <Input
            type="number"
            value={value ?? ""}
            onChange={(e) => set(e.target.value)}
          />
        </div>
      );
    case "fecha":
      return (
        <div className="space-y-1.5">
          {label}
          <Input type="date" value={value ?? ""} onChange={(e) => set(e.target.value)} />
        </div>
      );
    case "telefono":
      return (
        <div className="space-y-1.5">
          {label}
          <Input type="tel" value={value ?? ""} onChange={(e) => set(e.target.value)} />
        </div>
      );
    case "rfc":
    case "curp":
      return (
        <div className="space-y-1.5">
          {label}
          <Input
            value={value ?? ""}
            onChange={(e) => set(e.target.value.toUpperCase())}
            maxLength={campo.tipo === "rfc" ? 13 : 18}
            className="font-mono"
          />
        </div>
      );
    case "radio":
      return (
        <div className="space-y-1.5">
          {label}
          <RadioGroup value={value ?? ""} onValueChange={set}>
            {opciones.map((o) => (
              <div key={o.valor} className="flex items-center gap-2">
                <RadioGroupItem id={`${campo.id}_${o.valor}`} value={o.valor} />
                <Label htmlFor={`${campo.id}_${o.valor}`} className="text-sm font-normal">
                  {o.etiqueta}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    case "checkbox": {
      // 1 opción → boolean; >1 → multi-select array
      if (opciones.length <= 1) {
        return (
          <div className="flex items-center gap-2 py-1">
            <Checkbox
              id={campo.id}
              checked={!!value}
              onCheckedChange={(v) => set(!!v)}
            />
            <Label htmlFor={campo.id} className="text-sm font-normal">
              {campo.etiqueta || campo.clave}
              {campo.requerido && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        );
      }
      const arr: string[] = Array.isArray(value) ? value : [];
      const toggle = (val: string, on: boolean) => {
        const next = on ? [...arr, val] : arr.filter((x) => x !== val);
        set(next);
      };
      return (
        <div className="space-y-1.5">
          {label}
          <div className="space-y-1">
            {opciones.map((o) => (
              <div key={o.valor} className="flex items-center gap-2">
                <Checkbox
                  id={`${campo.id}_${o.valor}`}
                  checked={arr.includes(o.valor)}
                  onCheckedChange={(v) => toggle(o.valor, !!v)}
                />
                <Label htmlFor={`${campo.id}_${o.valor}`} className="text-sm font-normal">
                  {o.etiqueta}
                </Label>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "select":
      return (
        <div className="space-y-1.5">
          {label}
          <Select value={value ?? ""} onValueChange={set}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {opciones.map((o) => (
                <SelectItem key={o.valor} value={o.valor}>{o.etiqueta}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case "firma":
      return (
        <SignaturePicker
          value={value ?? null}
          onChange={(id) => set(id)}
          label={campo.etiqueta || campo.clave}
        />
      );
    case "diagnostico_cie":
    case "texto":
    default:
      return (
        <div className="space-y-1.5">
          {label}
          <Input
            value={value ?? ""}
            onChange={(e) => set(e.target.value)}
            maxLength={campo.longitud_max ?? undefined}
          />
        </div>
      );
  }
}
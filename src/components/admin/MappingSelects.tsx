import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMapeos } from "@/hooks/useFormatos";

export type MappingValue = {
  perfil: string | null;
  poliza: string | null;
  siniestro: string | null;
  medico: string | null;
};

interface Props {
  value: MappingValue;
  onChange: (v: MappingValue) => void;
}

const NONE = "__none__";

export function MappingSelects({ value, onChange }: Props) {
  const { data: mapeos } = useMapeos();

  const tabla: "perfil" | "poliza" | "siniestro" | "medico" | null = value.perfil
    ? "perfil"
    : value.poliza
    ? "poliza"
    : value.siniestro
    ? "siniestro"
    : value.medico
    ? "medico"
    : null;

  const columna = value.perfil ?? value.poliza ?? value.siniestro ?? value.medico ?? null;

  const opciones =
    tabla === "perfil"
      ? mapeos?.perfiles
      : tabla === "poliza"
      ? mapeos?.polizas
      : tabla === "siniestro"
      ? mapeos?.siniestros
      : tabla === "medico"
      ? mapeos?.medicos
      : [];

  const setTabla = (t: string) => {
    if (t === NONE) {
      onChange({ perfil: null, poliza: null, siniestro: null, medico: null });
    } else {
      onChange({
        perfil: t === "perfil" ? value.perfil : null,
        poliza: t === "poliza" ? value.poliza : null,
        siniestro: t === "siniestro" ? value.siniestro : null,
        medico: t === "medico" ? value.medico : null,
      });
    }
  };

  const setColumna = (c: string) => {
    const v = c === NONE ? null : c;
    onChange({
      perfil: tabla === "perfil" ? v : null,
      poliza: tabla === "poliza" ? v : null,
      siniestro: tabla === "siniestro" ? v : null,
      medico: tabla === "medico" ? v : null,
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <Select value={tabla ?? NONE} onValueChange={setTabla}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— Sin mapeo</SelectItem>
          <SelectItem value="perfil">Perfil</SelectItem>
          <SelectItem value="poliza">Póliza</SelectItem>
          <SelectItem value="siniestro">Siniestro</SelectItem>
          <SelectItem value="medico">Médico</SelectItem>
        </SelectContent>
      </Select>
      {tabla && (
        <Select value={columna ?? NONE} onValueChange={setColumna}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="— Columna" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>— Columna</SelectItem>
            {opciones?.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.nombre_display}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
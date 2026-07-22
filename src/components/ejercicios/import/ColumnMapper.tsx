import { CANONICAL_FIELDS, CanonicalField } from "@/lib/ejercicios/importParsers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Props = {
  headers: string[];
  mapping: Record<string, CanonicalField | "">;
  onChange: (m: Record<string, CanonicalField | "">) => void;
  sample?: Record<string, any>;
};

const REQUIRED: CanonicalField[] = ["fecha", "exercise"];

export function ColumnMapper({ headers, mapping, onChange, sample }: Props) {
  const mappedTargets = new Set(Object.values(mapping).filter(Boolean));
  const missingRequired = REQUIRED.filter((r) => !mappedTargets.has(r));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Mapeo de columnas</CardTitle>
        {missingRequired.length > 0 ? (
          <Badge variant="destructive">Faltan: {missingRequired.join(", ")}</Badge>
        ) : (
          <Badge variant="secondary">Listo</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Elegí a qué campo interno corresponde cada columna de tu archivo. Los obligatorios son <b>fecha</b> y <b>exercise</b>.
        </div>
        <div className="divide-y">
          {headers.map((h) => (
            <div key={h} className="grid grid-cols-2 gap-3 py-2 items-center">
              <div className="text-sm">
                <div className="font-medium">{h}</div>
                {sample?.[h] != null && (
                  <div className="text-xs text-muted-foreground truncate">Ej: {String(sample[h])}</div>
                )}
              </div>
              <Select
                value={mapping[h] || "__ignore__"}
                onValueChange={(v) => onChange({ ...mapping, [h]: v === "__ignore__" ? "" : (v as CanonicalField) })}
              >
                <SelectTrigger><SelectValue placeholder="Ignorar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ignore__">— Ignorar —</SelectItem>
                  {CANONICAL_FIELDS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { DynamicTableColumn } from "../types";

interface Props {
  rows: Record<string, any>[];
  columns: DynamicTableColumn[];
  onChange: (rows: Record<string, any>[]) => void;
  maxRows?: number;
  showTotal?: boolean;
  amountKey?: string; // defaults to "amount"
}

export default function DynamicTable({
  rows,
  columns,
  onChange,
  maxRows = 10,
  showTotal = false,
  amountKey = "amount",
}: Props) {
  const addRow = () => {
    if (rows.length >= maxRows) return;
    const blank: Record<string, any> = {};
    columns.forEach((c) => (blank[c.name] = ""));
    onChange([...rows, blank]);
  };

  const updateRow = (i: number, patch: Record<string, any>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  };

  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const total = showTotal
    ? rows.reduce((s, r) => s + (parseFloat(r[amountKey]) || 0), 0)
    : 0;

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Sin registros. Usa el botón para agregar.</p>
      )}
      {rows.map((row, i) => (
        <div key={i} className="rounded-md border p-3 space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {columns.map((col) => (
              <div key={col.name} className="space-y-1">
                <Label className="text-xs">{col.label}</Label>
                {col.type === "select" ? (
                  <Select value={row[col.name] || ""} onValueChange={(v) => updateRow(i, { [col.name]: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {(col.options || []).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={col.type === "number" || col.type === "money" ? "number" : "text"}
                    step={col.type === "money" ? "0.01" : undefined}
                    min={col.type === "money" || col.type === "number" ? 0 : undefined}
                    value={row[col.name] || ""}
                    onChange={(e) => updateRow(i, { [col.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={rows.length >= maxRows}>
          <Plus className="h-3 w-3 mr-1" /> Agregar
        </Button>
        {showTotal && (
          <span className="text-sm font-medium">
            Total: ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </span>
        )}
      </div>
    </div>
  );
}

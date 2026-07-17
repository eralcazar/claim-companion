import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";

type TableKey =
  | "blood_pressure_readings"
  | "spo2_readings"
  | "temperature_readings"
  | "heart_rate_readings";

const KINDS: { key: TableKey; label: string; valueFmt: (r: any) => string; unit: string }[] = [
  { key: "blood_pressure_readings", label: "Presión arterial", valueFmt: (r) => `${r.systolic}/${r.diastolic}`, unit: "mmHg" },
  { key: "spo2_readings", label: "SpO₂", valueFmt: (r) => `${r.spo2}`, unit: "%" },
  { key: "temperature_readings", label: "Temperatura", valueFmt: (r) => `${r.temperature_c}`, unit: "°C" },
  { key: "heart_rate_readings", label: "Frecuencia cardíaca", valueFmt: (r) => `${r.bpm}`, unit: "bpm" },
];

function esc(v: unknown) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Exporta CSV de lecturas BLE de PRUEBA / diagnóstico por paciente,
 * incluyendo el estado de validación (validada/rechazada/pendiente).
 */
export function BleTestReportButton({ patientId, patientName }: { patientId: string; patientName?: string }) {
  const { user, roles } = useAuth();
  const allowed = !!user?.id && (
    user.id === patientId ||
    roles.some((r) => ["admin", "medico", "enfermero", "broker", "laboratorio"].includes(r as string))
  );

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const defaultFrom = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<TableKey[]>(KINDS.map((k) => k.key));

  if (!allowed) return null;

  const toggle = (k: TableKey) =>
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const download = async () => {
    if (selected.length === 0) return toast.error("Selecciona al menos un tipo de lectura");
    if (from > to) return toast.error("Rango de fechas inválido");
    setLoading(true);
    try {
      const fromIso = `${from}T00:00:00.000Z`;
      const toIso = `${to}T23:59:59.999Z`;

      const rows: string[] = [];
      rows.push(["fecha", "tipo", "dispositivo", "valor", "unidad", "estado_validacion", "revisor", "observaciones"].join(","));

      // Cargar reviews del paciente para cruzar
      const { data: reviews } = await supabase
        .from("reading_reviews" as any)
        .select("reading_id,reading_kind,action,notes,reviewer_id")
        .eq("patient_id", patientId);
      const reviewMap = new Map<string, any>();
      (reviews ?? []).forEach((rv: any) => reviewMap.set(`${rv.reading_kind}:${rv.reading_id}`, rv));

      let count = 0;
      for (const kind of selected) {
        const { data, error } = await supabase
          .from(kind as any)
          .select("*")
          .eq("patient_id", patientId)
          .eq("source", "ble")
          .gte("taken_at", fromIso)
          .lte("taken_at", toIso)
          .order("taken_at", { ascending: false });
        if (error) continue;
        const kindLabel = KINDS.find((k) => k.key === kind)!;
        const shortKind = kind.replace("_readings", "");
        (data ?? []).forEach((r: any) => {
          const review = reviewMap.get(`${shortKind}:${r.id}`);
          const estado = review
            ? (review.action === "validate" ? "validada" : "rechazada")
            : (r.requires_review ? "pendiente" : "validada");
          rows.push([
            esc(r.taken_at),
            esc(kindLabel.label),
            esc(r.device_name ?? ""),
            esc(kindLabel.valueFmt(r)),
            esc(kindLabel.unit),
            esc(estado),
            esc(review?.reviewer_id ?? r.reviewed_by ?? ""),
            esc(review?.notes ?? r.review_notes ?? ""),
          ].join(","));
          count++;
        });
      }

      if (count === 0) { toast.info("Sin lecturas BLE en el período seleccionado"); return; }
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lecturas-ble-prueba-${(patientName ?? patientId).replace(/\s+/g, "_")}-${from}_a_${to}.csv`;
      document.body.appendChild(a);
      a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exportadas ${count} lecturas`);
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo exportar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" /> CSV de prueba
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar CSV de lecturas BLE de prueba</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Incluye todas las lecturas BLE (validadas, rechazadas y pendientes) para diagnóstico y auditoría.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>

          <div>
            <Label className="mb-2 block">Tipos de lectura</Label>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <label key={k.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selected.includes(k.key)} onCheckedChange={() => toggle(k.key)} />
                  {k.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={download} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Descargar CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
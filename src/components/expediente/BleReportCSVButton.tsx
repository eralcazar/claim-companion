import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";

type Row = Record<string, unknown>;

type TableKey =
  | "blood_pressure_readings"
  | "spo2_readings"
  | "temperature_readings"
  | "glucose_readings"
  | "heart_rate_readings"
  | "activity_readings";

const KINDS: { key: TableKey; label: string; columns: string[] }[] = [
  { key: "blood_pressure_readings", label: "Presión arterial", columns: ["taken_at", "systolic", "diastolic", "pulse", "source", "reviewed_by", "reviewed_at"] },
  { key: "spo2_readings",           label: "SpO₂",              columns: ["taken_at", "spo2", "pulse", "source", "reviewed_by", "reviewed_at"] },
  { key: "temperature_readings",    label: "Temperatura",       columns: ["taken_at", "temperature_c", "source", "reviewed_by", "reviewed_at"] },
  { key: "glucose_readings",        label: "Glucosa",           columns: ["taken_at", "glucose_mg_dl", "context", "source", "reviewed_by", "reviewed_at"] },
  { key: "heart_rate_readings",     label: "Frecuencia cardíaca", columns: ["taken_at", "bpm", "source"] },
  { key: "activity_readings",       label: "Actividad",         columns: ["fecha", "steps", "distance_m", "calories", "source"] },
];

const ALL_COLS = Array.from(new Set(KINDS.flatMap((k) => k.columns))).sort();

function escape(v: unknown) {
  const s = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows: Row[], columns: string[]): string {
  if (rows.length === 0) return "";
  const header = ["tipo", ...columns].join(",");
  const lines = rows.map((r) => ["tipo", ...columns].map((c) => escape(r[c])).join(","));
  return [header, ...lines].join("\n");
}

/**
 * Diálogo para exportar lecturas validadas con selector de rango de fechas,
 * tipos de lectura y columnas personalizadas. Sólo visible para roles con
 * necesidad clínica o administrativa (o el propio paciente).
 */
export function BleReportCSVButton({ patientId, patientName }: { patientId: string; patientName?: string }) {
  const { user, roles } = useAuth();
  const isAllowed =
    !!user?.id && (
      user.id === patientId ||
      roles.some((r) => ["admin", "medico", "enfermero", "broker", "laboratorio"].includes(r as string))
    );

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const defaultFrom = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const defaultTo = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [selectedKinds, setSelectedKinds] = useState<TableKey[]>(KINDS.map((k) => k.key));
  const [selectedCols, setSelectedCols] = useState<string[]>(["taken_at", "systolic", "diastolic", "spo2", "temperature_c", "glucose_mg_dl", "bpm", "source"]);
  const [statuses, setStatuses] = useState<Array<"pending" | "validated" | "discarded" | "mitigated">>(["validated"]);

  if (!isAllowed) return null;

  const toggleKind = (k: TableKey) =>
    setSelectedKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  const toggleCol = (c: string) =>
    setSelectedCols((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  const toggleStatus = (s: "pending" | "validated" | "discarded" | "mitigated") =>
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const handleDownload = async () => {
    if (selectedKinds.length === 0) return toast.error("Selecciona al menos un tipo de lectura");
    if (selectedCols.length === 0) return toast.error("Selecciona al menos una columna");
    if (statuses.length === 0) return toast.error("Selecciona al menos un estado de validación");
    if (from > to) return toast.error("El rango de fechas es inválido");
    setLoading(true);
    try {
      const fromIso = `${from}T00:00:00.000Z`;
      const toIso = `${to}T23:59:59.999Z`;
      const all: Row[] = [];
      // Cargar revisiones para determinar mitigado/rechazado
      let reviewMap: Record<string, "discarded" | "mitigated" | "validated"> = {};
      if (statuses.some((s) => s !== "pending")) {
        const { data: revs } = await supabase
          .from("reading_reviews" as any)
          .select("reading_kind, reading_id, action, notes")
          .eq("patient_id", patientId);
        (revs ?? []).forEach((r: any) => {
          const key = `${r.reading_kind}:${r.reading_id}`;
          reviewMap[key] = r.action === "discard"
            ? "discarded"
            : (r.notes && String(r.notes).trim().length > 0 ? "mitigated" : "validated");
        });
      }
      for (const kind of selectedKinds) {
        const dateField = kind === "activity_readings" ? "fecha" : "taken_at";
        let q = supabase.from(kind as any).select("*").eq("patient_id", patientId);
        q = q.gte(dateField, fromIso).lte(dateField, toIso);
        const { data, error } = await q.order(dateField, { ascending: false });
        if (error) continue;
        const shortKind = kind.replace("_readings", "");
        (data ?? []).forEach((r: any) => {
          const key = `${shortKind}:${r.id}`;
          const reviewStatus = reviewMap[key];
          let status: "pending" | "validated" | "discarded" | "mitigated";
          if (reviewStatus) status = reviewStatus;
          else if (r.requires_review) status = "pending";
          else status = "validated";
          if (!statuses.includes(status)) return;
          all.push({ tipo: shortKind, estado_validacion: status, ...r });
        });
      }
      if (all.length === 0) { toast.info("Sin lecturas en el período seleccionado"); return; }
      const blob = new Blob([toCsv(all, selectedCols)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lecturas-ble-${(patientName ?? patientId).replace(/\s+/g, "_")}-${from}_a_${to}.csv`;
      document.body.appendChild(a);
      a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exportadas ${all.length} lecturas`);
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
        <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />Exportar CSV validado</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Exportar lecturas validadas</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>

          <div>
            <Label className="mb-2 block">Tipos de lectura</Label>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <label key={k.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selectedKinds.includes(k.key)} onCheckedChange={() => toggleKind(k.key)} />
                  {k.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Columnas a incluir</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {ALL_COLS.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selectedCols.includes(c)} onCheckedChange={() => toggleCol(c)} />
                  <span className="font-mono text-xs">{c}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleDownload} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Descargar CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
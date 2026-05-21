import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateGlucose, type GlucoseContext } from "@/hooks/useGlucose";

function nowLocalDatetime(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 16);
}

interface Props {
  patientId: string;
  onSuccess?: () => void;
}

export function GlucoseForm({ patientId, onSuccess }: Props) {
  const create = useCreateGlucose();
  const [value, setValue] = useState("");
  const [context, setContext] = useState<GlucoseContext>("aleatoria");
  const [hours, setHours] = useState("");
  const [takenAt, setTakenAt] = useState(nowLocalDatetime());
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const g = parseInt(value, 10);
    if (isNaN(g) || g < 10 || g > 800) return;
    const h = hours ? parseFloat(hours.replace(",", ".")) : null;
    await create.mutateAsync({
      patient_id: patientId,
      taken_at: new Date(takenAt).toISOString(),
      glucose_mgdl: g,
      measurement_context: context,
      hours_since_meal: h,
      notes: notes.trim() || null,
    });
    setValue("");
    setHours("");
    setNotes("");
    setTakenAt(nowLocalDatetime());
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="g">Glucosa (mg/dL) *</Label>
          <Input id="g" type="number" min={10} max={800} placeholder="95"
            value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taken">Fecha y hora *</Label>
          <Input id="taken" type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Contexto de medición *</Label>
          <Select value={context} onValueChange={(v) => setContext(v as GlucoseContext)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ayuno">En ayuno (≥8 h)</SelectItem>
              <SelectItem value="pre_comida">Antes de comer</SelectItem>
              <SelectItem value="postprandial">2 h después de comer</SelectItem>
              <SelectItem value="aleatoria">Aleatoria</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hours">Horas desde última comida</Label>
          <Input id="hours" type="number" step="0.5" min={0} max={24} placeholder="2"
            value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Síntomas, medicación, etc." />
      </div>
      <Button type="submit" disabled={create.isPending} className="w-full md:w-auto">
        {create.isPending ? "Guardando..." : "Registrar glucosa"}
      </Button>
    </form>
  );
}
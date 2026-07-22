import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTemperature } from "@/hooks/useTemperature";
import { attachLocationIfEnabled } from "@/lib/geo/attach";
import { useLocationPreference } from "@/hooks/useLocationPreference";
import { MapPin } from "lucide-react";

function nowLocalDatetime(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60000).toISOString().slice(0, 16);
}

interface Props {
  patientId: string;
  onSuccess?: () => void;
}

export function TemperatureForm({ patientId, onSuccess }: Props) {
  const create = useCreateTemperature();
  const { tagging } = useLocationPreference();
  const [value, setValue] = useState("");
  const [method, setMethod] = useState("axilar");
  const [context, setContext] = useState("reposo");
  const [takenAt, setTakenAt] = useState(nowLocalDatetime());
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(value.replace(",", "."));
    if (isNaN(t) || t < 30 || t > 45) return;
    const base = {
      patient_id: patientId,
      taken_at: new Date(takenAt).toISOString(),
      temperature_c: t,
      method,
      context,
      notes: notes.trim() || null,
    };
    const payload = await attachLocationIfEnabled(base);
    await create.mutateAsync(payload as any);
    setValue("");
    setNotes("");
    setTakenAt(nowLocalDatetime());
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="temp">Temperatura (°C) *</Label>
          <Input id="temp" type="number" step="0.1" min={30} max={45} placeholder="36.8"
            value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taken">Fecha y hora *</Label>
          <Input id="taken" type="datetime-local" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Método</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="axilar">Axilar</SelectItem>
              <SelectItem value="oral">Oral</SelectItem>
              <SelectItem value="timpanica">Timpánica</SelectItem>
              <SelectItem value="frontal">Frontal</SelectItem>
              <SelectItem value="rectal">Rectal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Contexto</Label>
          <Select value={context} onValueChange={setContext}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reposo">En reposo</SelectItem>
              <SelectItem value="post_actividad">Post actividad</SelectItem>
              <SelectItem value="malestar">Con malestar</SelectItem>
              <SelectItem value="medicado">Después de medicamento</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Síntomas, observaciones..." />
      </div>
      <Button type="submit" disabled={create.isPending} className="w-full md:w-auto">
        {create.isPending ? "Guardando..." : "Registrar temperatura"}
      </Button>
      {tagging && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Se guardará tu ubicación aproximada con esta lectura.
        </p>
      )}
    </form>
  );
}
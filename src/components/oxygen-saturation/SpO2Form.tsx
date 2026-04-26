import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateSpO2 } from "@/hooks/useOxygenSaturation";

interface SpO2FormProps {
  onSuccess?: () => void;
}

function nowLocalDatetime(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60000);
  return local.toISOString().slice(0, 16);
}

export function SpO2Form({ onSuccess }: SpO2FormProps) {
  const { user } = useAuth();
  const create = useCreateSpO2();

  const [spo2, setSpo2] = useState<string>("");
  const [pulse, setPulse] = useState<string>("");
  const [takenAt, setTakenAt] = useState<string>(nowLocalDatetime());
  const [context, setContext] = useState<string>("reposo");
  const [notes, setNotes] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const spo2Num = parseInt(spo2, 10);
    if (isNaN(spo2Num) || spo2Num < 50 || spo2Num > 100) {
      return;
    }

    const pulseNum = pulse ? parseInt(pulse, 10) : null;
    if (pulseNum !== null && (isNaN(pulseNum) || pulseNum < 20 || pulseNum > 250)) {
      return;
    }

    await create.mutateAsync({
      patient_id: user.id,
      taken_at: new Date(takenAt).toISOString(),
      spo2: spo2Num,
      pulse: pulseNum,
      context: context || null,
      notes: notes.trim() || null,
    });

    setSpo2("");
    setPulse("");
    setNotes("");
    setTakenAt(nowLocalDatetime());
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="spo2">SpO2 (%) *</Label>
          <Input
            id="spo2"
            type="number"
            min={50}
            max={100}
            placeholder="98"
            value={spo2}
            onChange={(e) => setSpo2(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pulse">Pulso (bpm)</Label>
          <Input
            id="pulse"
            type="number"
            min={20}
            max={250}
            placeholder="72"
            value={pulse}
            onChange={(e) => setPulse(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taken_at">Fecha y hora *</Label>
          <Input
            id="taken_at"
            type="datetime-local"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="context">Contexto</Label>
          <Select value={context} onValueChange={setContext}>
            <SelectTrigger id="context">
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reposo">En reposo</SelectItem>
              <SelectItem value="actividad">Durante actividad</SelectItem>
              <SelectItem value="post_actividad">Después de actividad</SelectItem>
              <SelectItem value="sueno">Durante el sueño</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          placeholder="Observaciones, síntomas, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <Button type="submit" disabled={create.isPending} className="w-full md:w-auto">
        {create.isPending ? "Guardando..." : "Registrar lectura"}
      </Button>
    </form>
  );
}
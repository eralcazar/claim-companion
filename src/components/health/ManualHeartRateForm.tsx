import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCreateHeartRate, type HrContext } from "@/hooks/useHeartRate";
import { HeartPulse } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  bpm: z.coerce.number().int().min(20).max(260),
  measured_at: z.string().min(1),
  context: z.enum(["reposo", "ejercicio", "post_cita", "otro"]),
  notes: z.string().max(500).optional().nullable(),
});

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ManualHeartRateForm() {
  const mut = useCreateHeartRate();
  const [bpm, setBpm] = useState<string>("");
  const [measuredAt, setMeasuredAt] = useState<string>(nowLocalInput());
  const [context, setContext] = useState<HrContext>("reposo");
  const [notes, setNotes] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ bpm, measured_at: measuredAt, context, notes });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    try {
      await mut.mutateAsync({
        bpm: parsed.data.bpm,
        measured_at: new Date(parsed.data.measured_at).toISOString(),
        context: parsed.data.context,
        notes: parsed.data.notes || null,
        source: "manual",
      });
      toast.success("Lectura registrada");
      setBpm("");
      setNotes("");
    } catch (err: any) {
      toast.error(err?.message ?? "Error al guardar");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" /> Registro manual de frecuencia cardíaca
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="bpm">BPM</Label>
            <Input
              id="bpm"
              type="number"
              min={20}
              max={260}
              inputMode="numeric"
              placeholder="72"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="measured_at">Fecha y hora</Label>
            <Input
              id="measured_at"
              type="datetime-local"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Contexto</Label>
            <Select value={context} onValueChange={(v) => setContext(v as HrContext)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reposo">En reposo</SelectItem>
                <SelectItem value="ejercicio">Ejercicio</SelectItem>
                <SelectItem value="post_cita">Post cita</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Ej. después de subir escaleras"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Guardando..." : "Guardar lectura"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
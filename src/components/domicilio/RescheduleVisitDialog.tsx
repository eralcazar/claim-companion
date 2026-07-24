import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useProposeReschedule } from "@/hooks/useHomeVisits";

interface Props {
  visitId: string | null;
  open: boolean;
  onClose: () => void;
}

export function RescheduleVisitDialog({ visitId, open, onClose }: Props) {
  const [slots, setSlots] = useState<string[]>([""]);
  const [note, setNote] = useState("");
  const propose = useProposeReschedule();

  const update = (i: number, v: string) => setSlots((s) => s.map((x, idx) => (idx === i ? v : x)));
  const add = () => setSlots((s) => (s.length >= 5 ? s : [...s, ""]));
  const remove = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!visitId) return;
    const proposals = slots.filter(Boolean).map((v) => new Date(v).toISOString());
    if (!proposals.length) return;
    await propose.mutateAsync({ id: visitId, proposals, note: note || undefined });
    setSlots([""]);
    setNote("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reprogramar visita</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nuevas opciones de fecha/hora</Label>
            {slots.map((v, i) => (
              <div key={i} className="flex gap-2">
                <Input type="datetime-local" value={v} onChange={(e) => update(i, e.target.value)} />
                {slots.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {slots.length < 5 && (
              <Button type="button" size="sm" variant="outline" onClick={add}>
                <Plus className="h-4 w-4 mr-1" />Agregar opción
              </Button>
            )}
          </div>
          <div>
            <Label>Nota (opcional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Motivo o comentario" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!slots.some(Boolean) || propose.isPending} onClick={submit}>
            Enviar propuesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

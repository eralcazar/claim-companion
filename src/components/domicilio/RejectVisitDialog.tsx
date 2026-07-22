import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRejectHomeVisit } from "@/hooks/useHomeVisits";

const MOTIVOS = [
  "Fuera de mi cobertura",
  "Sin disponibilidad en ese horario",
  "Urgencia no compatible con mi práctica",
  "Datos incompletos",
  "Otro",
];

export function RejectVisitDialog({
  visitId,
  open,
  onClose,
}: {
  visitId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const reject = useRejectHomeVisit();
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [detalle, setDetalle] = useState("");

  const submit = async () => {
    if (!visitId) return;
    const full = motivo === "Otro" ? detalle.trim() || "Otro" : detalle.trim() ? `${motivo} — ${detalle.trim()}` : motivo;
    await reject.mutateAsync({ id: visitId, motivo: full });
    setDetalle("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rechazar solicitud</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Detalle (opcional)</Label>
            <Textarea rows={3} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Notas para el paciente" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={reject.isPending || (motivo === "Otro" && !detalle.trim())} onClick={submit}>
            Rechazar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
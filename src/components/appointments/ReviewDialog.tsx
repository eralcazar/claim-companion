import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useSubmitReview } from "@/hooks/useAvailability";

function Stars({
  value,
  onChange,
  size = 6,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(i)} className="p-0.5">
          <Star
            className={`h-${size} w-${size} ${
              i <= value ? "fill-primary text-primary" : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewDialog({
  open,
  onOpenChange,
  appointmentId,
  professionalId,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  appointmentId: string;
  professionalId: string;
  onSubmitted?: () => void;
}) {
  const submit = useSubmitReview();
  const [rating, setRating] = useState(5);
  const [puntualidad, setPuntualidad] = useState(5);
  const [trato, setTrato] = useState(5);
  const [claridad, setClaridad] = useState(5);
  const [comentario, setComentario] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calificar consulta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Calificación general</Label>
            <Stars value={rating} onChange={setRating} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Puntualidad</Label>
              <Stars value={puntualidad} onChange={setPuntualidad} size={4} />
            </div>
            <div>
              <Label className="text-xs">Trato</Label>
              <Stars value={trato} onChange={setTrato} size={4} />
            </div>
            <div>
              <Label className="text-xs">Claridad</Label>
              <Stars value={claridad} onChange={setClaridad} size={4} />
            </div>
          </div>
          <div>
            <Label>Comentario (opcional)</Label>
            <Textarea
              rows={3}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Comparte tu experiencia con otros pacientes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() =>
              submit.mutate(
                {
                  appointment_id: appointmentId,
                  professional_id: professionalId,
                  rating,
                  puntualidad,
                  trato,
                  claridad,
                  comentario: comentario.trim() || undefined,
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    onSubmitted?.();
                  },
                },
              )
            }
            disabled={submit.isPending}
          >
            Enviar reseña
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
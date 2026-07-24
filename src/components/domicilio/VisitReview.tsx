import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useVisitReview, useCreateVisitReview } from "@/hooks/useHomeVisitReviews";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  visit: any;
  currentUserId: string;
}

export function VisitReview({ visit, currentUserId }: Props) {
  const { data: review, isLoading } = useVisitReview(visit.id);
  const create = useCreateVisitReview();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  if (isLoading || visit.estado !== "completada") return null;

  const isPatient = visit.patient_id === currentUserId;
  const isDoctor = visit.doctor_id === currentUserId;

  if (review) {
    return (
      <Card className="w-full bg-muted/40">
        <CardContent className="py-3 space-y-1">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-4 w-4 ${n <= review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {format(new Date(review.created_at), "d MMM yyyy", { locale: es })}
            </span>
          </div>
          {review.comment && (
            <p className="text-xs text-foreground/80 italic">"{review.comment}"</p>
          )}
          {isDoctor && <p className="text-[10px] text-muted-foreground">Reseña del paciente</p>}
        </CardContent>
      </Card>
    );
  }

  if (!isPatient) {
    return <p className="text-xs text-muted-foreground italic">El paciente aún no dejó reseña.</p>;
  }

  return (
    <Card className="w-full border-dashed">
      <CardContent className="py-3 space-y-2">
        <p className="text-xs font-medium">¿Cómo fue tu visita?</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5"
            >
              <Star
                className={`h-5 w-5 transition ${
                  n <= (hover || rating) ? "fill-primary text-primary" : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Comentario (opcional)"
          className="text-xs"
        />
        <Button
          size="sm"
          disabled={!rating || create.isPending}
          onClick={() =>
            create.mutate({ visit_id: visit.id, doctor_id: visit.doctor_id, rating, comment })
          }
        >
          Enviar reseña
        </Button>
      </CardContent>
    </Card>
  );
}

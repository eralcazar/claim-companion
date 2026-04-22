import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  meetingUrl: string;
  appointmentDate: string;
  compact?: boolean;
}

export function VideoMeetingBlock({ meetingUrl, appointmentDate, compact }: Props) {
  const [copied, setCopied] = useState(false);
  const now = new Date();
  const apt = new Date(appointmentDate);
  const minsBefore = (apt.getTime() - now.getTime()) / 60000;
  const minsAfter = (now.getTime() - apt.getTime()) / 60000;

  const tooEarly = minsBefore > 15;
  const tooLate = minsAfter > 120;
  const canJoin = !tooEarly && !tooLate;

  const copy = async () => {
    await navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    toast.success("Link copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className={compact ? "p-3 space-y-2" : "p-4 space-y-3"}>
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Videoconsulta</p>
        </div>
        {tooEarly && (
          <p className="text-xs text-muted-foreground">
            Disponible 15 min antes de la cita ({Math.ceil(minsBefore - 15)} min restantes).
          </p>
        )}
        {tooLate && (
          <p className="text-xs text-destructive">
            Esta videoconsulta ya finalizó (hace más de 2 h).
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={!canJoin}
            onClick={() => window.open(meetingUrl, "_blank", "noopener,noreferrer")}
          >
            <Video className="h-4 w-4 mr-1" />
            Entrar a la videoconsulta
          </Button>
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copiado" : "Copiar link"}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground break-all">{meetingUrl}</p>
      </CardContent>
    </Card>
  );
}

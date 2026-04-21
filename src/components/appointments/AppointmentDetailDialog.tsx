import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, MapPin, User, Bell, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppointmentDocuments } from "./AppointmentDocuments";

interface Props {
  appointment: any | null;
  patientName?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit?: (appointment: any) => void;
  canEdit?: boolean;
}

const typeLabels: Record<string, string> = {
  consulta: "Consulta",
  estudio: "Estudio",
  procedimiento: "Procedimiento",
};

const reminderLabel = (m?: number | null) => {
  if (!m) return null;
  if (m < 60) return `${m} min antes`;
  if (m < 1440) return `${m / 60} h antes`;
  return `${m / 1440} día${m / 1440 > 1 ? "s" : ""} antes`;
};

export function AppointmentDetailDialog({ appointment, patientName, open, onOpenChange, onEdit, canEdit }: Props) {
  if (!appointment) return null;
  const a = appointment;
  const isPast = new Date(a.appointment_date) < new Date();
  const showEdit = canEdit && !isPast && onEdit;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle>{typeLabels[a.appointment_type] ?? a.appointment_type}</DialogTitle>
            {showEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit!(a);
                  onOpenChange(false);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {patientName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{patientName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(new Date(a.appointment_date), "PPP 'a las' p", { locale: es })}</span>
          </div>
          {a.doctor_name_manual && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Dr. {a.doctor_name_manual}</span>
            </div>
          )}
          {a.address && (
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="flex-1">{a.address}</span>
              {a.address_lat != null && a.address_lng != null && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${a.address_lat},${a.address_lng}`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
          {a.reminder_enabled && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span>Recordatorio: {reminderLabel(a.reminder_minutes_before)}</span>
            </div>
          )}
          {a.notes && <p className="text-muted-foreground">{a.notes}</p>}
        </div>

        <Separator />

        <AppointmentDocuments appointmentId={a.id} />
      </DialogContent>
    </Dialog>
  );
}
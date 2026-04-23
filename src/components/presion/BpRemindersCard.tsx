import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, BellOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  defaultTimezone,
  useBpReminders,
  useCreateBpReminder,
  useDeleteBpReminder,
  useUpdateBpReminder,
  WEEKDAY_LABELS,
  WEEKDAY_LONG,
  type BpReminder,
  type BpReminderMode,
} from "@/hooks/useBpReminders";

interface Props {
  patientId: string;
  canEdit: boolean;
}

function describe(r: BpReminder): string {
  if (r.mode === "interval") return `Cada ${r.interval_hours}h`;
  const t = (r.daily_times ?? []).join(", ");
  if (r.mode === "daily_times") return `Diario · ${t || "—"}`;
  const days = (r.weekdays ?? []).slice().sort().map((d) => WEEKDAY_LABELS[d]).join("·");
  return `${days || "—"} · ${t || "—"}`;
}

function emptyForm(patientId: string) {
  return {
    patient_id: patientId,
    mode: "daily_times" as BpReminderMode,
    interval_hours: 8,
    daily_times: ["08:00"] as string[],
    weekdays: [1, 2, 3, 4, 5] as number[],
    timezone: defaultTimezone(),
    label: "",
    active: true,
    ends_at: "" as string,
  };
}

async function ensureBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const r = await Notification.requestPermission();
    return r === "granted";
  } catch {
    return false;
  }
}

export function BpRemindersCard({ patientId, canEdit }: Props) {
  const { data: reminders = [], isLoading } = useBpReminders(patientId);
  const createMut = useCreateBpReminder();
  const updateMut = useUpdateBpReminder();
  const deleteMut = useDeleteBpReminder();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BpReminder | null>(null);
  const [deleting, setDeleting] = useState<BpReminder | null>(null);
  const [form, setForm] = useState(() => emptyForm(patientId));

  const browserSupportsNotif =
    typeof window !== "undefined" && "Notification" in window;
  const notifPermission =
    browserSupportsNotif ? Notification.permission : "default";

  const openNew = async () => {
    if (canEdit) await ensureBrowserNotificationPermission();
    setEditing(null);
    setForm(emptyForm(patientId));
    setOpen(true);
  };

  const openEdit = (r: BpReminder) => {
    setEditing(r);
    setForm({
      patient_id: patientId,
      mode: r.mode,
      interval_hours: r.interval_hours ?? 8,
      daily_times: r.daily_times && r.daily_times.length > 0 ? r.daily_times : ["08:00"],
      weekdays: r.weekdays && r.weekdays.length > 0 ? r.weekdays : [1, 2, 3, 4, 5],
      timezone: r.timezone,
      label: r.label ?? "",
      active: r.active,
      ends_at: r.ends_at ? r.ends_at.slice(0, 16) : "",
    });
    setOpen(true);
  };

  const addTime = () =>
    setForm((f) => ({ ...f, daily_times: [...f.daily_times, "08:00"] }));
  const removeTime = (i: number) =>
    setForm((f) => ({ ...f, daily_times: f.daily_times.filter((_, idx) => idx !== i) }));
  const setTime = (i: number, v: string) =>
    setForm((f) => ({ ...f, daily_times: f.daily_times.map((t, idx) => (idx === i ? v : t)) }));
  const toggleDay = (d: number) =>
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort(),
    }));

  const submit = async () => {
    if (form.mode === "interval") {
      if (!form.interval_hours || form.interval_hours < 1 || form.interval_hours > 168) {
        toast.error("Intervalo entre 1 y 168 horas");
        return;
      }
    }
    if (form.mode !== "interval" && form.daily_times.length === 0) {
      toast.error("Agrega al menos un horario");
      return;
    }
    if (form.mode === "weekly" && form.weekdays.length === 0) {
      toast.error("Selecciona al menos un día");
      return;
    }

    const payload = {
      patient_id: patientId,
      mode: form.mode,
      interval_hours: form.mode === "interval" ? form.interval_hours : null,
      daily_times: form.mode === "interval" ? [] : form.daily_times,
      weekdays: form.mode === "weekly" ? form.weekdays : [],
      timezone: form.timezone,
      label: form.label.trim() || null,
      active: form.active,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };

    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setOpen(false);
  };

  const sorted = useMemo(
    () => [...reminders].sort((a, b) => Number(b.active) - Number(a.active)),
    [reminders]
  );

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Recordatorios
        </CardTitle>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {browserSupportsNotif && notifPermission === "denied" && (
          <p className="text-xs text-muted-foreground">
            Las notificaciones del navegador están bloqueadas. Aún recibirás avisos dentro de la app.
          </p>
        )}
        {browserSupportsNotif && notifPermission === "default" && canEdit && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7"
            onClick={async () => {
              const ok = await ensureBrowserNotificationPermission();
              if (ok) toast.success("Notificaciones del navegador activadas");
            }}
          >
            <Bell className="h-3 w-3 mr-1" />
            Activar notificaciones del navegador
          </Button>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin recordatorios. {canEdit ? "Crea uno para recibir avisos automáticos." : ""}
          </p>
        ) : (
          <ul className="divide-y">
            {sorted.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {r.label?.trim() || "Recordatorio"}
                    </span>
                    {!r.active && (
                      <Badge variant="outline" className="text-xs">
                        <BellOff className="h-3 w-3 mr-1" />
                        Pausado
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{describe(r)}</p>
                  <p className="text-xs text-muted-foreground">
                    Próximo: {format(new Date(r.next_run_at), "PPp", { locale: es })}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        updateMut.mutate({ id: r.id, patient_id: patientId, active: !r.active })
                      }
                      title={r.active ? "Pausar" : "Reanudar"}
                    >
                      {r.active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleting(r)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {/* Dialog crear/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar recordatorio" : "Nuevo recordatorio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="bpr-label">Etiqueta (opcional)</Label>
              <Input
                id="bpr-label"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ej. Toma matutina"
                maxLength={80}
              />
            </div>
            <div>
              <Label>Tipo de horario</Label>
              <Select
                value={form.mode}
                onValueChange={(v) => setForm((f) => ({ ...f, mode: v as BpReminderMode }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interval">Cada N horas</SelectItem>
                  <SelectItem value="daily_times">Horarios fijos diarios</SelectItem>
                  <SelectItem value="weekly">Días + horarios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.mode === "interval" && (
              <div>
                <Label htmlFor="bpr-int">Cada cuántas horas</Label>
                <Input
                  id="bpr-int"
                  type="number"
                  min={1}
                  max={168}
                  value={form.interval_hours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, interval_hours: Number(e.target.value) }))
                  }
                />
              </div>
            )}

            {form.mode !== "interval" && (
              <div>
                <Label>Horarios</Label>
                <div className="space-y-2 mt-1">
                  {form.daily_times.map((t, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        type="time"
                        value={t}
                        onChange={(e) => setTime(i, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTime(i)}
                        disabled={form.daily_times.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addTime}>
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar horario
                  </Button>
                </div>
              </div>
            )}

            {form.mode === "weekly" && (
              <div>
                <Label>Días de la semana</Label>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {WEEKDAY_LONG.map((name, idx) => {
                    const on = form.weekdays.includes(idx);
                    return (
                      <Button
                        key={idx}
                        type="button"
                        variant={on ? "default" : "outline"}
                        size="sm"
                        className="w-10 px-0"
                        onClick={() => toggleDay(idx)}
                        title={name}
                      >
                        {WEEKDAY_LABELS[idx]}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="bpr-end">Fecha de fin (opcional)</Label>
              <Input
                id="bpr-end"
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between rounded border p-2">
              <div>
                <Label htmlFor="bpr-active" className="cursor-pointer">Activo</Label>
                <p className="text-xs text-muted-foreground">
                  Si está apagado, no se enviarán avisos.
                </p>
              </div>
              <Switch
                id="bpr-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Zona horaria: <span className="font-mono">{form.timezone}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {editing ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación borrado */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar recordatorio?</AlertDialogTitle>
            <AlertDialogDescription>
              No volverás a recibir avisos de este recordatorio. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                await deleteMut.mutateAsync({ id: deleting.id, patient_id: patientId });
                setDeleting(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
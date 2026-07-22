import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, Trash2, CalendarClock } from "lucide-react";
import { useReminders, useUpsertReminder, useDeleteReminder, useMaterializePlan } from "@/hooks/useWorkoutReminders";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function PlanRemindersCard({ planId }: { planId: string }) {
  const { data: reminders = [] } = useReminders(planId);
  const upsert = useUpsertReminder();
  const del = useDeleteReminder();
  const materialize = useMaterializePlan();

  const [weekday, setWeekday] = useState(1);
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);
  const [minutesBefore, setMinutesBefore] = useState(30);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Recordatorios y calendario</CardTitle>
        <Button size="sm" variant="outline" onClick={() => materialize.mutate({ plan_id: planId, weeks: 4 })} disabled={materialize.isPending} className="gap-1">
          <CalendarClock className="h-4 w-4" /> {materialize.isPending ? "Programando..." : "Programar 4 semanas"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-5 gap-2 items-end">
          <div>
            <Label className="text-xs">Día</Label>
            <select className="w-full h-9 rounded-md border bg-background text-sm px-2" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div><Label className="text-xs">Hora</Label><Input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} /></div>
          <div><Label className="text-xs">Min</Label><Input type="number" min={0} max={59} value={minute} onChange={(e) => setMinute(Number(e.target.value))} /></div>
          <div><Label className="text-xs">Aviso (min antes)</Label><Input type="number" min={0} max={180} value={minutesBefore} onChange={(e) => setMinutesBefore(Number(e.target.value))} /></div>
          <Button
            size="sm"
            onClick={() => upsert.mutate({ plan_id: planId, weekday, hour, minute, minutes_before: minutesBefore, active: true, channels: { in_app: true, push: true } })}
            disabled={upsert.isPending}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>

        <div className="space-y-1">
          {reminders.length === 0 && <div className="text-xs text-muted-foreground">Sin recordatorios aún.</div>}
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{DAYS[r.weekday]}</Badge>
                <span>{String(r.hour).padStart(2, "0")}:{String(r.minute).padStart(2, "0")}</span>
                <span className="text-xs text-muted-foreground">avisar {r.minutes_before} min antes</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={r.active} onCheckedChange={(v) => upsert.mutate({ id: r.id, plan_id: planId, active: v })} />
                <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { SessionLog, SetLog, ExerciseCatalog } from "@/hooks/useExercises";
import { useScheduledSessions } from "@/hooks/useWorkoutReminders";
import { CalendarClock, BellRing } from "lucide-react";

type Props = { sessions: SessionLog[]; sets: SetLog[]; catalog: ExerciseCatalog[] };

const CAT_COLOR: Record<string, string> = {
  fuerza: "bg-primary",
  cardio: "bg-orange-500",
  movilidad: "bg-emerald-500",
  deporte: "bg-violet-500",
};

export function TrainingCalendar({ sessions, sets, catalog }: Props) {
  const [month, setMonth] = useState(() => new Date());
  const { data: scheduled = [] } = useScheduledSessions(60);

  const catById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionLog[]>();
    for (const s of sessions) {
      const arr = map.get(s.fecha) ?? [];
      arr.push(s);
      map.set(s.fecha, arr);
    }
    return map;
  }, [sessions]);

  const scheduledByDay = useMemo(() => {
    const map = new Map<string, typeof scheduled>();
    for (const s of scheduled) {
      const key = s.scheduled_at.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [scheduled]);

  const setsBySession = useMemo(() => {
    const map = new Map<string, SetLog[]>();
    for (const s of sets) {
      const arr = map.get(s.session_log_id) ?? [];
      arr.push(s);
      map.set(s.session_log_id, arr);
    }
    return map;
  }, [sets]);

  const firstOffset = getDay(days[0]); // 0=Dom

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Button size="icon" variant="ghost" onClick={() => setMonth(subMonths(month, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="font-semibold capitalize">{format(month, "MMMM yyyy", { locale: es })}</div>
          <Button size="icon" variant="ghost" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground">
          {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map((d) => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstOffset }).map((_, i) => <div key={`e${i}`} />)}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const daySessions = sessionsByDay.get(key) ?? [];
            const cats = new Set<string>();
            for (const ss of daySessions) {
              for (const st of setsBySession.get(ss.id) ?? []) {
                const cat = catById.get(st.exercise_id)?.category;
                if (cat) cats.add(cat);
              }
            }
            const today = isSameDay(day, new Date());
            return (
              <div
                key={key}
                className={`rounded-md border p-1 min-h-16 text-xs ${today ? "border-primary" : "border-border"} ${daySessions.length ? "bg-muted/30" : ""}`}
              >
                <div className="text-right text-muted-foreground">{format(day, "d")}</div>
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {Array.from(cats).map((c) => (
                    <span key={c} className={`h-1.5 w-1.5 rounded-full ${CAT_COLOR[c] ?? "bg-muted-foreground"}`} title={c} />
                  ))}
                  {(scheduledByDay.get(key) ?? []).some((s) => s.status === "pending") && (
                    <span title="Sesión programada"><CalendarClock className="h-3 w-3 text-primary" /></span>
                  )}
                  {(scheduledByDay.get(key) ?? []).some((s) => s.reminder_sent_at) && (
                    <span title="Recordatorio enviado"><BellRing className="h-3 w-3 text-amber-500" /></span>
                  )}
                </div>
                {daySessions.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {daySessions.slice(0, 2).map((s) => {
                      const first = (setsBySession.get(s.id) ?? [])[0];
                      const exId = first?.exercise_id;
                      return (
                        <Link
                          key={s.id}
                          to={exId ? `/ejercicios/${exId}` : "/ejercicios"}
                          className="block truncate text-[10px] hover:underline"
                        >
                          {s.environment}
                        </Link>
                      );
                    })}
                    {daySessions.length > 2 && <Badge variant="secondary" className="text-[10px] px-1 py-0">+{daySessions.length - 2}</Badge>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {Object.entries(CAT_COLOR).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1 capitalize"><span className={`h-2 w-2 rounded-full ${v}`} /> {k}</div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
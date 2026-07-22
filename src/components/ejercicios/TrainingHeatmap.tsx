import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Props = {
  dates: string[]; // ISO yyyy-mm-dd of sessions
  weeks?: number;
};

export function TrainingHeatmap({ dates, weeks = 26 }: Props) {
  const cells = useMemo(() => {
    const set = new Map<string, number>();
    for (const d of dates) set.set(d, (set.get(d) ?? 0) + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // start on the Monday of the earliest week
    const totalDays = weeks * 7;
    const start = new Date(today);
    start.setDate(start.getDate() - (totalDays - 1));
    const days: { date: string; count: number }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, count: set.get(key) ?? 0 });
    }
    return days;
  }, [dates, weeks]);

  const cols = weeks;
  const grid: (typeof cells)[number][][] = Array.from({ length: cols }, () => []);
  cells.forEach((c, i) => grid[Math.floor(i / 7)].push(c));

  return (
    <div className="flex gap-[3px] overflow-x-auto">
      {grid.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} sesión${d.count === 1 ? "" : "es"}`}
              className={cn(
                "h-3 w-3 rounded-sm",
                d.count === 0 && "bg-muted",
                d.count === 1 && "bg-primary/40",
                d.count === 2 && "bg-primary/70",
                d.count >= 3 && "bg-primary",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

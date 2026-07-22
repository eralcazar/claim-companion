import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE = (uid: string) => `cc.extverif.${uid}`;
const DEFAULT_INTERVALS_MIN = [5, 15, 60];

export type ExtendedRun = {
  run_id: string;
  started_at: number;
  intervals_min: number[];
  next_at: number | null;
  step: number;
  completed: number[];
  active: boolean;
};

const initial = (): ExtendedRun => ({
  run_id: "",
  started_at: 0,
  intervals_min: DEFAULT_INTERVALS_MIN,
  next_at: null,
  step: 0,
  completed: [],
  active: false,
});

function load(uid: string): ExtendedRun {
  try {
    const raw = localStorage.getItem(STORAGE(uid));
    if (!raw) return initial();
    return { ...initial(), ...JSON.parse(raw) };
  } catch {
    return initial();
  }
}
function save(uid: string, s: ExtendedRun) {
  try { localStorage.setItem(STORAGE(uid), JSON.stringify(s)); } catch { /* noop */ }
}

export function useExtendedVerification(
  runTest: (opts: { runId: string; trigger: "extended" }) => Promise<void>,
) {
  const { user } = useAuth();
  const [state, setState] = useState<ExtendedRun>(initial());
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const persist = useCallback((s: ExtendedRun) => {
    setState(s);
    if (user?.id) save(user.id, s);
  }, [user?.id]);

  const schedule = useCallback((s: ExtendedRun) => {
    clearTimer();
    if (!s.active || s.next_at == null) return;
    const delay = Math.max(0, s.next_at - Date.now());
    timerRef.current = window.setTimeout(async () => {
      const stepIndex = s.step;
      try {
        await runTest({ runId: s.run_id, trigger: "extended" });
      } catch { /* still advance */ }
      const completed = [...s.completed, stepIndex];
      const nextStep = stepIndex + 1;
      const done = nextStep >= s.intervals_min.length;
      const next: ExtendedRun = done
        ? { ...s, completed, step: nextStep, next_at: null, active: false }
        : {
            ...s,
            completed,
            step: nextStep,
            next_at: Date.now() + s.intervals_min[nextStep] * 60_000,
          };
      persist(next);
      schedule(next);
    }, delay);
  }, [runTest, persist]);

  const start = useCallback((intervals: number[] = DEFAULT_INTERVALS_MIN) => {
    const run_id = crypto.randomUUID();
    const now = Date.now();
    const s: ExtendedRun = {
      run_id,
      started_at: now,
      intervals_min: intervals,
      next_at: now + intervals[0] * 60_000,
      step: 0,
      completed: [],
      active: true,
    };
    persist(s);
    schedule(s);
    return run_id;
  }, [persist, schedule]);

  const cancel = useCallback(() => {
    clearTimer();
    persist(initial());
  }, [persist]);

  useEffect(() => {
    if (!user?.id) return;
    const s = load(user.id);
    setState(s);
    if (s.active) schedule(s);
    return clearTimer;
  }, [user?.id, schedule]);

  return { state, start, cancel };
}
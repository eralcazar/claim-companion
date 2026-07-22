import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const BACKOFF_MS = [30_000, 2 * 60_000, 5 * 60_000, 15 * 60_000];
const STORAGE = (uid: string) => `cc.autoretry.health.${uid}`;

export type AutoRetryState = {
  active: boolean;
  attempt: number;
  maxAttempts: number;
  nextAttemptAt: number | null;
  lastError: string | null;
  lastAttemptAt: number | null;
};

const INITIAL: AutoRetryState = {
  active: false,
  attempt: 0,
  maxAttempts: BACKOFF_MS.length,
  nextAttemptAt: null,
  lastError: null,
  lastAttemptAt: null,
};

function load(uid: string): AutoRetryState {
  try {
    const raw = localStorage.getItem(STORAGE(uid));
    if (!raw) return INITIAL;
    return { ...INITIAL, ...JSON.parse(raw) };
  } catch {
    return INITIAL;
  }
}

function save(uid: string, s: AutoRetryState) {
  try {
    localStorage.setItem(STORAGE(uid), JSON.stringify(s));
  } catch { /* noop */ }
}

type SyncFn = () => Promise<unknown>;

/**
 * Reintentos client-side con backoff exponencial cuando la sync a Health
 * Connect / Apple Salud falla. Persistente vía localStorage.
 */
export function useAutoRetrySync(syncFn: SyncFn) {
  const { user } = useAuth();
  const [state, setState] = useState<AutoRetryState>(INITIAL);
  const timerRef = useRef<number | null>(null);

  const update = useCallback(
    (patch: Partial<AutoRetryState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        if (user?.id) save(user.id, next);
        return next;
      });
    },
    [user?.id],
  );

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancel = useCallback(() => {
    clearTimer();
    update({ ...INITIAL });
  }, [update]);

  const runAttempt = useCallback(async () => {
    try {
      await syncFn();
      cancel();
    } catch (err: any) {
      const errMsg = err?.message ?? "Error desconocido";
      setState((prev) => {
        const nextAttempt = prev.attempt + 1;
        if (nextAttempt >= BACKOFF_MS.length) {
          const done = {
            ...prev,
            active: false,
            attempt: nextAttempt,
            nextAttemptAt: null,
            lastAttemptAt: Date.now(),
            lastError: errMsg,
          };
          if (user?.id) save(user.id, done);
          return done;
        }
        const nextAt = Date.now() + BACKOFF_MS[nextAttempt];
        const s = {
          ...prev,
          active: true,
          attempt: nextAttempt,
          nextAttemptAt: nextAt,
          lastAttemptAt: Date.now(),
          lastError: errMsg,
        };
        if (user?.id) save(user.id, s);
        clearTimer();
        timerRef.current = window.setTimeout(runAttempt, BACKOFF_MS[nextAttempt]);
        return s;
      });
    }
  }, [syncFn, cancel, user?.id]);

  /** Llamar cuando el sync manual falla — arranca el bucle de reintento. */
  const start = useCallback(
    (errorMessage: string) => {
      clearTimer();
      const nextAt = Date.now() + BACKOFF_MS[0];
      const s: AutoRetryState = {
        active: true,
        attempt: 0,
        maxAttempts: BACKOFF_MS.length,
        nextAttemptAt: nextAt,
        lastError: errorMessage,
        lastAttemptAt: Date.now(),
      };
      setState(s);
      if (user?.id) save(user.id, s);
      timerRef.current = window.setTimeout(runAttempt, BACKOFF_MS[0]);
    },
    [runAttempt, user?.id],
  );

  const retryNow = useCallback(async () => {
    clearTimer();
    await runAttempt();
  }, [runAttempt]);

  // Hidratar y reprogramar al montar
  useEffect(() => {
    if (!user?.id) return;
    const s = load(user.id);
    setState(s);
    if (s.active && s.nextAttemptAt) {
      const delay = Math.max(0, s.nextAttemptAt - Date.now());
      clearTimer();
      timerRef.current = window.setTimeout(runAttempt, delay);
    }
    return clearTimer;
  }, [user?.id, runAttempt]);

  return { state, start, cancel, retryNow };
}
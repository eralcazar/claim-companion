import { useCallback, useEffect, useRef, useState } from "react";
import { watchLocation, type GeoPoint, type WatchHandle } from "@/lib/geo/location";
import { haversineMeters } from "@/lib/geo/haversine";
import type { TrackingMode } from "@/hooks/useLocationPreference";

export type TrackingState = {
  isTracking: boolean;
  isPaused: boolean;
  points: GeoPoint[];
  distanceM: number;
  durationS: number;
  elevationGainM: number;
  startedAt: number | null;
};

const initial: TrackingState = {
  isTracking: false,
  isPaused: false,
  points: [],
  distanceM: 0,
  durationS: 0,
  elevationGainM: 0,
  startedAt: null,
};

export function useLiveTracking() {
  const [state, setState] = useState<TrackingState>(initial);
  const watchRef = useRef<WatchHandle | null>(null);
  const tickRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  const handlePoint = useCallback((p: GeoPoint) => {
    if (pausedRef.current) return;
    setState((s) => {
      const last = s.points[s.points.length - 1];
      if (p.accuracy_m && p.accuracy_m > 50 && s.points.length > 0) return s;
      const addedDist = last ? haversineMeters(last, p) : 0;
      if (last && addedDist < 3) return s;
      const dAlt =
        last && last.altitude_m != null && p.altitude_m != null
          ? p.altitude_m - last.altitude_m
          : 0;
      return {
        ...s,
        points: [...s.points, p],
        distanceM: s.distanceM + addedDist,
        elevationGainM: s.elevationGainM + Math.max(0, dAlt),
      };
    });
  }, []);

  const start = useCallback(async (mode: TrackingMode = "balanced") => {
    if (watchRef.current) return;
    const opts = (() => {
      if (mode === "high_accuracy") return { highAccuracy: true, maximumAgeMs: 0, timeoutMs: 15000 };
      if (mode === "battery_saver") return { highAccuracy: false, maximumAgeMs: 15000, timeoutMs: 30000 };
      return { highAccuracy: true, maximumAgeMs: 5000, timeoutMs: 15000 };
    })();
    const handle = await watchLocation(handlePoint, opts);
    watchRef.current = handle;
    const startedAt = Date.now();
    pausedRef.current = false;
    setState({ ...initial, isTracking: true, startedAt });
    tickRef.current = window.setInterval(() => {
      if (pausedRef.current) return;
      setState((s) =>
        s.startedAt ? { ...s, durationS: Math.floor((Date.now() - s.startedAt) / 1000) } : s,
      );
    }, 1000);
  }, [handlePoint]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setState((s) => ({ ...s, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setState((s) => ({ ...s, isPaused: false }));
  }, []);

  const stop = useCallback(() => {
    watchRef.current?.clear();
    watchRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setState((s) => ({ ...s, isTracking: false, isPaused: false }));
  }, []);

  const reset = useCallback(() => {
    watchRef.current?.clear();
    watchRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    pausedRef.current = false;
    setState(initial);
  }, []);

  useEffect(() => {
    return () => {
      watchRef.current?.clear();
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  return { state, start, pause, resume, stop, reset };
}
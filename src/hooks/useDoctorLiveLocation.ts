import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { watchLocation, type GeoPoint, type WatchHandle } from "@/lib/geo/location";
import { toast } from "sonner";

const MIN_INTERVAL_MS = 8000; // throttle writes
const MIN_DELTA_M = 15; // ignore jitter under 15m

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Doctor-side: streams GPS location to home_visit_requests while enabled.
 * Returns status flags for UI.
 */
export function useShareDoctorLocation(visitId: string | null, enabled: boolean) {
  const [active, setActive] = useState(false);
  const [lastPoint, setLastPoint] = useState<GeoPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSentRef = useRef<{ ts: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!visitId || !enabled) return;
    let handle: WatchHandle | null = null;
    let cancelled = false;

    (async () => {
      // Mark sharing on
      await supabase
        .from("home_visit_requests" as any)
        .update({ doctor_location_sharing: true })
        .eq("id", visitId);
      if (cancelled) return;
      setActive(true);

      handle = await watchLocation(async (p) => {
        setLastPoint(p);
        const now = Date.now();
        const prev = lastSentRef.current;
        const dist = prev ? haversine(prev, { lat: p.latitude, lng: p.longitude }) : Infinity;
        if (prev && now - prev.ts < MIN_INTERVAL_MS && dist < MIN_DELTA_M) return;
        lastSentRef.current = { ts: now, lat: p.latitude, lng: p.longitude };
        const { error: e } = await supabase
          .from("home_visit_requests" as any)
          .update({
            doctor_lat: p.latitude,
            doctor_lng: p.longitude,
            doctor_location_accuracy_m: p.accuracy_m ?? null,
            doctor_location_updated_at: new Date().toISOString(),
          })
          .eq("id", visitId);
        if (e) setError(e.message);
      }, { highAccuracy: true });
    })().catch((e) => {
      setError(e?.message ?? "No se pudo iniciar la ubicación");
      toast.error("No se pudo iniciar la ubicación");
    });

    return () => {
      cancelled = true;
      handle?.clear();
      setActive(false);
      supabase
        .from("home_visit_requests" as any)
        .update({ doctor_location_sharing: false })
        .eq("id", visitId)
        .then(() => undefined);
    };
  }, [visitId, enabled]);

  return { active, lastPoint, error };
}

export type LiveDoctorLocation = {
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  updated_at: string | null;
  sharing: boolean;
};

/**
 * Patient-side: subscribes to realtime updates of the visit row and returns
 * the doctor's current location plus the accumulated trajectory.
 */
export function useVisitLiveDoctorLocation(visit: any | null) {
  const [loc, setLoc] = useState<LiveDoctorLocation>({
    lat: visit?.doctor_lat != null ? Number(visit.doctor_lat) : null,
    lng: visit?.doctor_lng != null ? Number(visit.doctor_lng) : null,
    accuracy_m: visit?.doctor_location_accuracy_m != null ? Number(visit.doctor_location_accuracy_m) : null,
    updated_at: visit?.doctor_location_updated_at ?? null,
    sharing: !!visit?.doctor_location_sharing,
  });
  const [track, setTrack] = useState<Array<[number, number]>>(() => {
    if (visit?.doctor_lat != null && visit?.doctor_lng != null) {
      return [[Number(visit.doctor_lat), Number(visit.doctor_lng)]];
    }
    return [];
  });

  useEffect(() => {
    if (!visit?.id) return;
    const channel = supabase
      .channel(`visit-live-${visit.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "home_visit_requests", filter: `id=eq.${visit.id}` },
        (payload) => {
          const row: any = payload.new;
          const next: LiveDoctorLocation = {
            lat: row.doctor_lat != null ? Number(row.doctor_lat) : null,
            lng: row.doctor_lng != null ? Number(row.doctor_lng) : null,
            accuracy_m: row.doctor_location_accuracy_m != null ? Number(row.doctor_location_accuracy_m) : null,
            updated_at: row.doctor_location_updated_at ?? null,
            sharing: !!row.doctor_location_sharing,
          };
          setLoc(next);
          if (next.lat != null && next.lng != null) {
            setTrack((prev) => {
              const last = prev[prev.length - 1];
              if (last && last[0] === next.lat && last[1] === next.lng) return prev;
              return [...prev, [next.lat!, next.lng!]].slice(-500);
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [visit?.id]);

  return { loc, track };
}
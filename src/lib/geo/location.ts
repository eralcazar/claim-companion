// Unified geolocation wrapper (web + Capacitor).
// Silently returns null when unavailable / denied so callers can degrade.

export type GeoPoint = {
  latitude: number;
  longitude: number;
  accuracy_m?: number;
  altitude_m?: number | null;
  speed_mps?: number | null;
  heading_deg?: number | null;
  captured_at: string; // ISO
};

export type WatchHandle = { clear: () => void };

async function getCapacitorGeo(): Promise<any | null> {
  try {
    const cap: any = (globalThis as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return null;
    const mod = await import(/* @vite-ignore */ "@capacitor/geolocation").catch(
      () => null,
    );
    return mod?.Geolocation ?? null;
  } catch {
    return null;
  }
}

function toGeoPoint(pos: GeolocationPosition | any): GeoPoint {
  const c = pos.coords ?? pos;
  return {
    latitude: Number(c.latitude),
    longitude: Number(c.longitude),
    accuracy_m: c.accuracy != null ? Number(c.accuracy) : undefined,
    altitude_m: c.altitude != null ? Number(c.altitude) : null,
    speed_mps: c.speed != null ? Number(c.speed) : null,
    heading_deg: c.heading != null ? Number(c.heading) : null,
    captured_at: new Date(pos.timestamp ?? Date.now()).toISOString(),
  };
}

export async function getCurrentLocation(
  opts: { timeoutMs?: number; highAccuracy?: boolean } = {},
): Promise<GeoPoint | null> {
  const { timeoutMs = 8000, highAccuracy = true } = opts;
  const capGeo = await getCapacitorGeo();
  if (capGeo) {
    try {
      const perm = await capGeo.checkPermissions().catch(() => null);
      if (perm && perm.location !== "granted") {
        const req = await capGeo.requestPermissions().catch(() => null);
        if (!req || req.location !== "granted") return null;
      }
      const pos = await capGeo.getCurrentPosition({
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
      });
      return toGeoPoint(pos);
    } catch {
      return null;
    }
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toGeoPoint(pos)),
      () => resolve(null),
      { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 5000 },
    );
  });
}

export async function watchLocation(
  onPoint: (p: GeoPoint) => void,
  opts: { highAccuracy?: boolean } = {},
): Promise<WatchHandle> {
  const { highAccuracy = true } = opts;
  const capGeo = await getCapacitorGeo();
  if (capGeo) {
    const id = await capGeo.watchPosition(
      { enableHighAccuracy: highAccuracy, timeout: 15000 },
      (pos: any, err: any) => {
        if (err || !pos) return;
        onPoint(toGeoPoint(pos));
      },
    );
    return { clear: () => capGeo.clearWatch({ id }).catch(() => undefined) };
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { clear: () => undefined };
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onPoint(toGeoPoint(pos)),
    () => undefined,
    { enableHighAccuracy: highAccuracy, maximumAge: 2000, timeout: 15000 },
  );
  return { clear: () => navigator.geolocation.clearWatch(id) };
}

// Unified geolocation permission probe (web + Capacitor best-effort).
export type GeoPermissionState = "granted" | "denied" | "prompt" | "unavailable";

export async function checkGeoPermission(): Promise<GeoPermissionState> {
  try {
    const cap: any = (globalThis as any).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const dynImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
      const mod = await dynImport("@capacitor/geolocation").catch(() => null);
      const Geo = mod?.Geolocation;
      if (Geo?.checkPermissions) {
        const r = await Geo.checkPermissions();
        if (r?.location === "granted") return "granted";
        if (r?.location === "denied") return "denied";
        return "prompt";
      }
    }
  } catch {
    /* fall through */
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unavailable";
  try {
    const perms: any = (navigator as any).permissions;
    if (perms?.query) {
      const res = await perms.query({ name: "geolocation" as PermissionName });
      return (res.state as GeoPermissionState) ?? "prompt";
    }
  } catch {
    /* ignore */
  }
  return "prompt";
}

export async function requestGeoPermission(): Promise<GeoPermissionState> {
  try {
    const cap: any = (globalThis as any).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const dynImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
      const mod = await dynImport("@capacitor/geolocation").catch(() => null);
      const Geo = mod?.Geolocation;
      if (Geo?.requestPermissions) {
        const r = await Geo.requestPermissions();
        return r?.location === "granted" ? "granted" : "denied";
      }
    }
  } catch {
    /* ignore */
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) return "unavailable";
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve("granted"),
      (err) => resolve(err.code === err.PERMISSION_DENIED ? "denied" : "prompt"),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

export function permissionInstructions(state: GeoPermissionState): string {
  if (state === "denied") {
    return "El permiso de ubicación está bloqueado. En iPhone: Ajustes → Safari/Chrome → Ubicación → Permitir. En Android: Ajustes del sitio → Permisos → Ubicación. En escritorio: candado junto a la URL → Ubicación → Permitir.";
  }
  if (state === "unavailable") {
    return "Este dispositivo o navegador no ofrece geolocalización.";
  }
  return "Cuando inicies el recorrido, el navegador pedirá permiso para usar tu ubicación. Aceptalo para grabar la ruta.";
}
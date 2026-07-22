// Helper: attach optional location fields to a reading payload
// when the user's tagging preference is enabled.
import { getCurrentLocation } from "./location";
import { supabase } from "@/integrations/supabase/client";

let cachedPref: { enabled: boolean; ts: number } | null = null;

async function isTaggingEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedPref && now - cachedPref.ts < 60_000) return cachedPref.enabled;
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return false;
  const { data } = await supabase
    .from("profiles")
    .select("location_tagging_enabled")
    .eq("id", uid)
    .maybeSingle();
  const enabled = !!(data as any)?.location_tagging_enabled;
  cachedPref = { enabled, ts: now };
  return enabled;
}

export function invalidateLocationPrefCache() {
  cachedPref = null;
}

/**
 * Merges { latitude, longitude, location_accuracy_m, location_captured_at }
 * into `payload` when the user has opted in. Silent no-op otherwise.
 */
export async function attachLocationIfEnabled<T extends Record<string, unknown>>(
  payload: T,
): Promise<T> {
  try {
    if (!(await isTaggingEnabled())) return payload;
    const p = await getCurrentLocation({ timeoutMs: 6000 });
    if (!p) return payload;
    return {
      ...payload,
      latitude: p.latitude,
      longitude: p.longitude,
      location_accuracy_m: p.accuracy_m ?? null,
      location_captured_at: p.captured_at,
    };
  } catch {
    return payload;
  }
}
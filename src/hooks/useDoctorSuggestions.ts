import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haversineMeters } from "@/lib/geo/haversine";

export type DoctorSuggestion = {
  user_id: string;
  full_name: string;
  in_coverage: boolean;
  distance_m: number | null;
  available_today: boolean;
};

export function useDoctorSuggestions(params: {
  lat: number | null;
  lng: number | null;
  enabled?: boolean;
}) {
  const { lat, lng, enabled = true } = params;
  return useQuery({
    queryKey: ["doctor-suggestions", lat, lng],
    enabled: enabled && lat != null && lng != null,
    queryFn: async (): Promise<DoctorSuggestion[]> => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "medico");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];

      const [{ data: profiles }, { data: areas }, { data: avail }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids),
        supabase
          .from("coverage_areas" as any)
          .select("owner_id, center_lat, center_lng, radius_m, activa")
          .eq("activa", true),
        supabase
          .from("professional_availability")
          .select("professional_id, weekday, activo")
          .eq("activo", true)
          .eq("weekday", new Date().getDay()),
      ]);

      const availSet = new Set((avail ?? []).map((a: any) => a.professional_id));
      const areasByOwner = new Map<string, any[]>();
      for (const a of areas ?? []) {
        if (!a.owner_id) continue;
        const arr = areasByOwner.get(a.owner_id) ?? [];
        arr.push(a);
        areasByOwner.set(a.owner_id, arr);
      }

      const rows: DoctorSuggestion[] = ids.map((uid) => {
        const p = (profiles ?? []).find((x: any) => x.user_id === uid) as any;
        const own = areasByOwner.get(uid) ?? [];
        let best: number | null = null;
        let inCov = false;
        for (const a of own) {
          const d = haversineMeters(
            { latitude: lat!, longitude: lng! },
            { latitude: a.center_lat, longitude: a.center_lng },
          );
          if (best == null || d < best) best = d;
          if (d <= (a.radius_m ?? 0)) inCov = true;
        }
        return {
          user_id: uid,
          full_name: p?.full_name?.trim() || p?.email || "Sin nombre",
          in_coverage: inCov,
          distance_m: best,
          available_today: availSet.has(uid),
        };
      });

      rows.sort((a, b) => {
        if (a.in_coverage !== b.in_coverage) return a.in_coverage ? -1 : 1;
        if (a.available_today !== b.available_today) return a.available_today ? -1 : 1;
        const da = a.distance_m ?? Number.POSITIVE_INFINITY;
        const db = b.distance_m ?? Number.POSITIVE_INFINITY;
        return da - db;
      });
      return rows;
    },
  });
}
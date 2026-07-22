import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TrackingMode = "balanced" | "high_accuracy" | "battery_saver";

export type LocationPreference = {
  tagging: boolean;
  tracking: boolean;
  mode: TrackingMode;
  loading: boolean;
};

export function useLocationPreference() {
  const [state, setState] = useState<LocationPreference>({
    tagging: false,
    tracking: false,
    mode: "balanced",
    loading: true,
  });

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setState({ tagging: false, tracking: false, mode: "balanced", loading: false });
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("location_tagging_enabled, location_tracking_enabled, location_tracking_mode")
      .eq("id", uid)
      .maybeSingle();
    setState({
      tagging: !!data?.location_tagging_enabled,
      tracking: !!data?.location_tracking_enabled,
      mode: ((data as any)?.location_tracking_mode as TrackingMode) ?? "balanced",
      loading: false,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<Pick<LocationPreference, "tagging" | "tracking" | "mode">>) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const payload: Record<string, boolean | string> = {};
      if (patch.tagging !== undefined)
        payload.location_tagging_enabled = patch.tagging;
      if (patch.tracking !== undefined)
        payload.location_tracking_enabled = patch.tracking;
      if (patch.mode !== undefined)
        payload.location_tracking_mode = patch.mode;
      const { error } = await (supabase.from("profiles") as any)
        .update(payload)
        .eq("id", uid);
      if (!error) setState((s) => ({ ...s, ...patch }));
    },
    [],
  );

  return { ...state, update, reload: load };
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LocationPreference = {
  tagging: boolean;
  tracking: boolean;
  loading: boolean;
};

export function useLocationPreference() {
  const [state, setState] = useState<LocationPreference>({
    tagging: false,
    tracking: false,
    loading: true,
  });

  const load = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setState({ tagging: false, tracking: false, loading: false });
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("location_tagging_enabled, location_tracking_enabled")
      .eq("id", uid)
      .maybeSingle();
    setState({
      tagging: !!data?.location_tagging_enabled,
      tracking: !!data?.location_tracking_enabled,
      loading: false,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<Pick<LocationPreference, "tagging" | "tracking">>) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      const payload: Record<string, boolean> = {};
      if (patch.tagging !== undefined)
        payload.location_tagging_enabled = patch.tagging;
      if (patch.tracking !== undefined)
        payload.location_tracking_enabled = patch.tracking;
      const { error } = await (supabase.from("profiles") as any)
        .update(payload)
        .eq("id", uid);
      if (!error) setState((s) => ({ ...s, ...patch }));
    },
    [],
  );

  return { ...state, update, reload: load };
}

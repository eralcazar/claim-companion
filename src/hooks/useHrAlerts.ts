import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type HrAlertSettings = {
  user_id: string;
  min_bpm: number;
  max_bpm: number;
  enabled: boolean;
  notify_in_app: boolean;
  updated_at: string;
};

const DEFAULT: Omit<HrAlertSettings, "user_id" | "updated_at"> = {
  min_bpm: 55,
  max_bpm: 110,
  enabled: true,
  notify_in_app: true,
};

export function useHrAlertSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hr_alert_settings", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<HrAlertSettings> => {
      const { data, error } = await supabase
        .from("hr_alert_settings" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return {
          user_id: user!.id,
          ...DEFAULT,
          updated_at: new Date().toISOString(),
        };
      }
      return data as any;
    },
  });
}

export function useUpsertHrAlertSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Omit<HrAlertSettings, "user_id" | "updated_at">>) => {
      if (!user?.id) throw new Error("Sesión requerida");
      const { error } = await supabase
        .from("hr_alert_settings" as any)
        .upsert(
          { user_id: user.id, ...DEFAULT, ...input },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr_alert_settings"] });
    },
  });
}

export type HrAlertKind = "low" | "high" | "in_range";

export function classifyAgainstRange(
  bpm: number,
  settings: Pick<HrAlertSettings, "min_bpm" | "max_bpm">,
): HrAlertKind {
  if (bpm < settings.min_bpm) return "low";
  if (bpm > settings.max_bpm) return "high";
  return "in_range";
}

/** Insert an in-app notification when a HR reading is out of the user's range. */
export async function maybeNotifyOutOfRange(params: {
  userId: string;
  bpm: number;
  measured_at: string;
  source?: string | null;
}) {
  const { data: settingsRow } = await supabase
    .from("hr_alert_settings" as any)
    .select("min_bpm, max_bpm, enabled, notify_in_app")
    .eq("user_id", params.userId)
    .maybeSingle();
  const s = (settingsRow as any) ?? DEFAULT;
  if (!s.enabled || !s.notify_in_app) return null;
  const kind = classifyAgainstRange(params.bpm, s);
  if (kind === "in_range") return null;

  const title =
    kind === "low"
      ? `Frecuencia cardiaca baja (${params.bpm} lpm)`
      : `Frecuencia cardiaca alta (${params.bpm} lpm)`;
  const body =
    kind === "low"
      ? `Por debajo de tu límite mínimo (${s.min_bpm} lpm).`
      : `Por encima de tu límite máximo (${s.max_bpm} lpm).`;

  const eventKey = `hr-alert-${kind}-${params.measured_at}`;
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    title,
    body,
    link: "/historial-salud",
    category: "clinical_alerts",
    event_key: eventKey,
  } as any);
  if (error && !/duplicate|conflict/i.test(error.message)) {
    // ignore duplicates, surface others silently
    console.warn("[hr-alert] notify insert failed", error.message);
  }
  return kind;
}
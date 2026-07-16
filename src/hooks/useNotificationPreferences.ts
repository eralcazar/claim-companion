import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationPreferences = {
  user_id: string;
  pending_validated: boolean;
  clinical_alerts: boolean;
  reminders: boolean;
  system_messages: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
};

export const DEFAULT_PREFS: NotificationPreferences = {
  user_id: "",
  pending_validated: true,
  clinical_alerts: true,
  reminders: true,
  system_messages: true,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification_preferences", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data, error } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ...DEFAULT_PREFS, user_id: user!.id };
      return data as unknown as NotificationPreferences;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error("Sesión requerida");
      const { error } = await supabase
        .from("notification_preferences" as any)
        .upsert({ ...DEFAULT_PREFS, ...patch, user_id: user.id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification_preferences", user?.id] }),
  });
}

/** Devuelve true si la hora actual está dentro del rango de silencio configurado. */
export function isInQuietHours(prefs: NotificationPreferences | undefined, now: Date = new Date()): boolean {
  if (!prefs?.quiet_hours_enabled || !prefs.quiet_hours_start || !prefs.quiet_hours_end) return false;
  const [sh, sm] = prefs.quiet_hours_start.split(":").map(Number);
  const [eh, em] = prefs.quiet_hours_end.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false;
  if (s < e) return cur >= s && cur < e;
  // Rango que cruza medianoche (p. ej. 22:00 → 07:00)
  return cur >= s || cur < e;
}

/** Categoriza una notificación por el título/link para aplicar preferencias. */
export function notificationCategory(n: { title?: string | null; link?: string | null; body?: string | null }):
  | "pending_validated"
  | "clinical_alerts"
  | "reminders"
  | "system_messages" {
  const t = `${n.title ?? ""} ${n.body ?? ""}`.toLowerCase();
  if (t.includes("alerta")) return "clinical_alerts";
  if (t.includes("recordatorio") || t.includes("cita") || t.includes("medicamento")) return "reminders";
  if (t.includes("validad") || t.includes("revisad")) return "pending_validated";
  return "system_messages";
}
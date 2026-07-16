import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  isInQuietHours,
  notificationCategory,
  useNotificationPreferences,
} from "@/hooks/useNotificationPreferences";

/**
 * Notificaciones push (fallback web) + reenvío automático de las notificaciones
 * insertadas en `notifications` (por triggers de servidor) como toast del sistema
 * cuando la app está en segundo plano.
 *
 * En builds nativos con @capacitor/push-notifications, este hook se puede extender
 * para registrar el token en `user_push_tokens`.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const { data: prefs } = useNotificationPreferences();

  useEffect(() => {
    if (!user?.id) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => void 0);
    }

    const shown = new Set<string>();

    const showNotification = async (n: any) => {
      if (!n?.id || shown.has(n.id)) return;
      if (n.push_sent_at) { shown.add(n.id); return; } // ya sincronizado
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      if (document.visibilityState === "visible") return; // toast in-app cubre foreground
      const category: "pending_validated" | "clinical_alerts" | "reminders" | "system_messages" =
        n.category ?? notificationCategory(n);
      if (prefs && prefs[category] === false) return;
      // Alertas críticas ignoran horario de silencio
      if (category !== "clinical_alerts" && isInQuietHours(prefs)) return;
      // Reserva atómica: si otra pestaña/dispositivo ya la marcó, no la mostramos.
      const { data: ok } = await supabase.rpc("mark_notification_pushed" as any, {
        _notification_id: n.id,
      });
      if (ok !== true) { shown.add(n.id); return; }
      shown.add(n.id);
      try {
        new Notification(n.title ?? "CareCentral", {
          body: n.body ?? "",
          icon: "/favicon.ico",
          tag: n.event_key ?? n.id,
        });
      } catch {
        // ignorar errores del navegador
      }
    };

    // Al montar: buscamos notificaciones recientes aún no sincronizadas.
    (async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("notifications")
        .select("id,title,body,link,category,event_key,push_sent_at,created_at")
        .eq("user_id", user.id)
        .is("push_sent_at", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      for (const n of data ?? []) await showNotification(n);
    })();

    const channel = supabase
      .channel(`notif-push-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => { void showNotification(payload.new as any); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, prefs]);
}
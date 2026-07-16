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
    // Web: solicita permiso una sola vez
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => void 0);
    }

    // Suscripción realtime a las notificaciones del usuario
    const channel = supabase
      .channel(`notif-push-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n: any = payload.new;
          if (typeof window === "undefined" || !("Notification" in window)) return;
          if (Notification.permission !== "granted") return;
          if (document.visibilityState === "visible") return; // el toast in-app ya se muestra
          // Respeta preferencias por categoría y horario de silencio.
          const category = notificationCategory(n);
          if (prefs && prefs[category] === false) return;
          if (isInQuietHours(prefs)) return;
          try {
            new Notification(n.title ?? "CareCentral", {
              body: n.body ?? "",
              icon: "/favicon.ico",
              tag: n.id,
            });
          } catch {
            // ignorar errores del navegador
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, prefs]);
}
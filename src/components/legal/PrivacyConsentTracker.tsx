import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PRIVACY_VERSION } from "@/lib/validators";

/**
 * Registra automáticamente el consentimiento de aviso de privacidad
 * la primera vez que un usuario autenticado entra a la app, o cuando
 * cambia la versión vigente. Idempotente.
 */
export function PrivacyConsentTracker() {
  const { user } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (!user?.id || done.current) return;
    done.current = true;
    (async () => {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("privacy_version, privacy_accepted_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (prof?.privacy_version === PRIVACY_VERSION) return;

        await supabase.from("consents").insert([
          {
            user_id: user.id,
            patient_id: user.id,
            consent_type: "privacy",
            version: PRIVACY_VERSION,
            accepted: true,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            metadata: { source: "auto_login" } as any,
          },
        ]);

        await supabase
          .from("profiles")
          .update({
            privacy_accepted_at: new Date().toISOString(),
            privacy_version: PRIVACY_VERSION,
          })
          .eq("user_id", user.id);
      } catch (e) {
        // no bloquear la UI si falla el registro
        console.warn("[PrivacyConsentTracker]", e);
      }
    })();
  }, [user?.id]);

  return null;
}
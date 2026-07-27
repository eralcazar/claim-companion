import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-mexicoes-signature, x-mexicoes-timestamp",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function b64urlDecode(input: string) {
  const pad = input.replace(/-/g, "+").replace(/_/g, "/");
  return atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
}

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function logEvent(
  event_type: string,
  data: {
    user_id?: string | null;
    mexicoes_user_id?: string | null;
    payload?: Record<string, unknown>;
    success?: boolean;
    error_message?: string | null;
  },
) {
  try {
    await admin().from("mexicoes_bridge_events").insert({
      event_type,
      user_id: data.user_id ?? null,
      mexicoes_user_id: data.mexicoes_user_id ?? null,
      payload: data.payload ?? {},
      success: data.success ?? true,
      error_message: data.error_message ?? null,
    });
  } catch (_) {
    // never block the request on audit failure
  }
}

/** Verifies a "Pasaporte MexicoEs" link token: base64url(payload).hexHmac */
async function verifyLinkToken(secret: string, token: string) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) throw new Error("Token con formato inválido");
  const [payloadPart, signature] = parts;
  const expected = await hmacHex(secret, payloadPart);
  if (!timingSafeEqual(expected, signature.toLowerCase())) throw new Error("Firma del token inválida");
  const payload = JSON.parse(b64urlDecode(payloadPart)) as {
    mexicoes_user_id?: string;
    entitlements?: Record<string, unknown>;
    exp?: number;
  };
  if (!payload.mexicoes_user_id) throw new Error("El token no contiene mexicoes_user_id");
  if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error("El token expiró");
  return payload;
}

/** Server-to-server signature: HMAC(secret, `${timestamp}.${rawBody}`) */
async function verifyServerSignature(secret: string, req: Request, rawBody: string) {
  const signature = req.headers.get("x-mexicoes-signature");
  const timestamp = req.headers.get("x-mexicoes-timestamp");
  if (!signature || !timestamp) throw new Error("Faltan encabezados de firma");
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) throw new Error("Timestamp fuera de rango");
  const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
  if (!timingSafeEqual(expected, signature.toLowerCase())) throw new Error("Firma inválida");
}

async function getLink(mexicoesUserId: string) {
  const { data } = await admin()
    .from("mexicoes_links")
    .select("*")
    .eq("mexicoes_user_id", mexicoesUserId)
    .eq("status", "linked")
    .maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("MEXICOES_BRIDGE_SECRET");
  if (!secret) return json({ error: "El puente MexicoEs no está configurado (falta el secreto compartido)." }, 500);

  const rawBody = await req.text();
  let body: Record<string, any> = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const action = String(body.action || "");

  try {
    // ---- User-initiated actions (require a CareCentral session) ----
    if (action === "link" || action === "unlink" || action === "my_link" || action === "self_test") {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader) return json({ error: "No autenticado" }, 401);
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      const user = userData?.user;
      if (!user) return json({ error: "Sesión inválida" }, 401);

      if (action === "my_link") {
        const { data } = await admin().from("mexicoes_links").select("*").eq("user_id", user.id).maybeSingle();
        return json({ link: data ?? null });
      }

      // Guided self-test: exercises the same primitives MexicoEs uses (HMAC token,
      // link, status, sync_entitlements) end-to-end for the signed-in user.
      if (action === "self_test") {
        const steps: Array<{ key: string; label: string; ok: boolean; detail: string }> = [];
        const simulateLink = body.simulate_link === true;

        steps.push({ key: "secret", label: "Secreto compartido configurado", ok: true, detail: "MEXICOES_BRIDGE_SECRET presente" });

        // 1. HMAC round-trip (same scheme as the server-to-server signature)
        const ts = Math.floor(Date.now() / 1000).toString();
        const probe = JSON.stringify({ action: "ping" });
        const sig = await hmacHex(secret, `${ts}.${probe}`);
        const hmacOk = timingSafeEqual(sig, await hmacHex(secret, `${ts}.${probe}`));
        steps.push({ key: "hmac", label: "Firma HMAC-SHA256", ok: hmacOk, detail: hmacOk ? `firma ${sig.slice(0, 12)}…` : "no se pudo firmar" });

        // 2. Link (existing, or simulated with a locally-minted test token)
        let link = (await admin().from("mexicoes_links").select("*").eq("user_id", user.id).maybeSingle()).data;
        if ((!link || link.status !== "linked") && simulateLink) {
          const payloadObj = {
            mexicoes_user_id: `test-${user.id.slice(0, 8)}`,
            entitlements: { plan: "prueba", membresia_activa: true },
            exp: Math.floor(Date.now() / 1000) + 300,
          };
          const payloadPart = btoa(JSON.stringify(payloadObj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          const testToken = `${payloadPart}.${await hmacHex(secret, payloadPart)}`;
          const verified = await verifyLinkToken(secret, testToken);
          const up = await admin()
            .from("mexicoes_links")
            .upsert(
              {
                user_id: user.id,
                mexicoes_user_id: verified.mexicoes_user_id,
                entitlements: verified.entitlements ?? {},
                status: "linked",
                linked_at: new Date().toISOString(),
                revoked_at: null,
              },
              { onConflict: "user_id" },
            )
            .select()
            .single();
          if (up.error) throw new Error(up.error.message);
          link = up.data;
          steps.push({ key: "link", label: "Vinculación con token de prueba", ok: true, detail: `cuenta ${verified.mexicoes_user_id}` });
        } else {
          const ok = !!link && link.status === "linked";
          steps.push({
            key: "link",
            label: "Vínculo activo",
            ok,
            detail: ok ? `cuenta ${link!.mexicoes_user_id}` : "no hay vínculo activo (activa el modo simulado)",
          });
        }

        // 3. Status lookup (what MexicoEs receives)
        if (link && link.status === "linked") {
          const { data: profile } = await admin()
            .from("profiles")
            .select("full_name, active_role")
            .eq("id", user.id)
            .maybeSingle();
          steps.push({
            key: "status",
            label: "Consulta de estado",
            ok: true,
            detail: `${profile?.full_name ?? "sin nombre"} · rol ${profile?.active_role ?? "n/d"}`,
          });

          // 4. Entitlements sync round-trip
          const merged = {
            ...((link.entitlements ?? {}) as Record<string, unknown>),
            last_sync_test: new Date().toISOString(),
          };
          const sync = await admin()
            .from("mexicoes_links")
            .update({ entitlements: merged })
            .eq("id", link.id)
            .select()
            .single();
          if (sync.error) throw new Error(sync.error.message);
          link = sync.data;
          steps.push({
            key: "sync",
            label: "Sincronización de entitlements",
            ok: true,
            detail: `${Object.keys(merged).length} claves sincronizadas`,
          });
        }

        const ok = steps.every((s) => s.ok);
        await logEvent("self_test", {
          user_id: user.id,
          mexicoes_user_id: link?.mexicoes_user_id ?? null,
          payload: { simulate_link: simulateLink, steps },
          success: ok,
        });
        return json({ ok, steps, link: link ?? null, at: new Date().toISOString() });
      }

      if (action === "unlink") {
        await admin()
          .from("mexicoes_links")
          .update({ status: "revoked", revoked_at: new Date().toISOString() })
          .eq("user_id", user.id);
        await logEvent("unlink", { user_id: user.id });
        return json({ ok: true });
      }

      const payload = await verifyLinkToken(secret, body.token);
      const existing = await getLink(payload.mexicoes_user_id!);
      if (existing && existing.user_id !== user.id) {
        await logEvent("link", {
          user_id: user.id,
          mexicoes_user_id: payload.mexicoes_user_id,
          success: false,
          error_message: "La cuenta MexicoEs ya está vinculada a otro usuario",
        });
        return json({ error: "Esa cuenta de MexicoEs ya está vinculada a otro usuario de CareCentral." }, 409);
      }

      const { data: link, error } = await admin()
        .from("mexicoes_links")
        .upsert(
          {
            user_id: user.id,
            mexicoes_user_id: payload.mexicoes_user_id,
            entitlements: payload.entitlements ?? {},
            status: "linked",
            linked_at: new Date().toISOString(),
            revoked_at: null,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();
      if (error) throw new Error(error.message);

      await logEvent("link", { user_id: user.id, mexicoes_user_id: payload.mexicoes_user_id });
      return json({ ok: true, link });
    }

    // ---- Server-to-server actions (called by MexicoEs) ----
    await verifyServerSignature(secret, req, rawBody);

    // Health check: verifies only that both sides share the same secret.
    if (action === "ping") {
      return json({ ok: true, secret_match: true, at: new Date().toISOString() });
    }

    const mexicoesUserId = String(body.mexicoes_user_id || "");
    if (!mexicoesUserId) return json({ error: "Falta mexicoes_user_id" }, 400);
    const link = await getLink(mexicoesUserId);
    if (!link) return json({ error: "Cuenta no vinculada con CareCentral", linked: false }, 404);

    if (action === "status") {
      const { data: profile } = await admin()
        .from("profiles")
        .select("id, full_name, active_role")
        .eq("id", link.user_id)
        .maybeSingle();
      await logEvent("status", { user_id: link.user_id, mexicoes_user_id: mexicoesUserId });
      return json({
        linked: true,
        linked_at: link.linked_at,
        entitlements: link.entitlements,
        profile: profile ? { full_name: profile.full_name, active_role: profile.active_role } : null,
      });
    }

    if (action === "sync_entitlements") {
      const { data } = await admin()
        .from("mexicoes_links")
        .update({ entitlements: body.entitlements ?? {} })
        .eq("id", link.id)
        .select()
        .single();
      await logEvent("sync_entitlements", {
        user_id: link.user_id,
        mexicoes_user_id: mexicoesUserId,
        payload: { entitlements: body.entitlements ?? {} },
      });
      return json({ ok: true, link: data });
    }

    if (action === "create_home_visit") {
      const motivo = String(body.motivo || "").trim();
      const direccion = String(body.direccion || "").trim();
      if (!motivo || !direccion) return json({ error: "motivo y direccion son obligatorios" }, 400);

      const { data: visit, error } = await admin()
        .from("home_visit_requests")
        .insert({
          patient_id: link.user_id,
          requested_by: link.user_id,
          motivo,
          direccion,
          urgencia: body.urgencia === "urgente" || body.urgencia === "emergencia" ? body.urgencia : "normal",
          lat: body.lat ?? null,
          lng: body.lng ?? null,
          notas: body.notas ?? null,
          origin: body.origin === "mexicoes_911" ? "mexicoes_911" : "mexicoes",
          external_ref: body.external_ref ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      await logEvent("create_home_visit", {
        user_id: link.user_id,
        mexicoes_user_id: mexicoesUserId,
        payload: { visit_id: visit.id, origin: visit.origin, external_ref: visit.external_ref },
      });
      return json({ ok: true, request: visit });
    }

    if (action === "list_home_visits") {
      const limit = Math.min(Number(body.limit) || 20, 100);
      const { data } = await admin()
        .from("home_visit_requests")
        .select("id, motivo, urgencia, estado, direccion, origin, external_ref, created_at, accepted_at, llegado_at")
        .eq("patient_id", link.user_id)
        .order("created_at", { ascending: false })
        .limit(limit);
      return json({ requests: data ?? [] });
    }

    return json({ error: `Acción no soportada: ${action}` }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    await logEvent(action || "unknown", { success: false, error_message: message });
    return json({ error: message }, 400);
  }
});

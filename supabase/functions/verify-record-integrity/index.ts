import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALGORITHM_VERSION = "v1-sha256-hmac";

function keyEnvName(keyId: string) {
  return `INTEGRITY_KEY_${keyId.replace(/-/g, "_")}`;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { table, id, share_token } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve verifier identity + type + authorization
    const authHeader = req.headers.get("Authorization") ?? "";
    let verifierId: string | null = null;
    let verifierType: "owner" | "broker" | "clinician" | "admin" | "public" | "system" = "public";
    let patientId: string | null = null;
    let shareTokenId: string | null = null;

    if (authHeader && !share_token) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ valid: false, error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      verifierId = user.id;
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      verifierType = isAdmin ? "admin" : "owner";

      // Fetch patient_id column value to check access
      const patientCol = table === "medical_records" ? "user_id" : "patient_id";
      const { data: recRow } = await supabase.from(table).select(`${patientCol}`).eq("id", id).maybeSingle();
      patientId = (recRow as any)?.[patientCol] ?? null;

      if (!isAdmin && patientId && patientId !== user.id) {
        const { data: access } = await supabase.rpc("has_patient_access", { _personnel: user.id, _patient: patientId });
        if (!access) {
          return new Response(JSON.stringify({ valid: false, error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        verifierType = "clinician";
      }
    } else if (share_token) {
      // Public path via share token
      const { data: tok } = await supabase
        .from("integrity_share_tokens")
        .select("*")
        .eq("token", share_token)
        .maybeSingle();
      if (!tok || tok.revoked_at || new Date(tok.expires_at) < new Date()) {
        return new Response(JSON.stringify({ valid: false, error: "invalid_or_expired_token" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (tok.max_uses != null && tok.uses_count >= tok.max_uses) {
        return new Response(JSON.stringify({ valid: false, error: "token_exhausted" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const patientCol = table === "medical_records" ? "user_id" : "patient_id";
      const { data: recRow } = await supabase.from(table).select(`${patientCol}`).eq("id", id).maybeSingle();
      patientId = (recRow as any)?.[patientCol] ?? null;
      const okScope = tok.scope === "patient_daily"
        ? tok.patient_id === patientId
        : (tok.table_name === table && tok.record_id === id);
      if (!okScope) {
        return new Response(JSON.stringify({ valid: false, error: "token_scope_mismatch" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      shareTokenId = tok.token;
      verifierType = "public";
      await supabase.from("integrity_share_tokens").update({ uses_count: tok.uses_count + 1 }).eq("id", tok.id);
    } else {
      return new Response(JSON.stringify({ valid: false, error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: rpc, error } = await supabase.rpc("verify_record_hash", { _table: table, _id: id });
    if (error) {
      return new Response(JSON.stringify({ valid: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let signature_ok: boolean | null = null;
    if (rpc?.has_signature && rpc?.key_id && rpc?.record_hash) {
      const { data: row } = await supabase.from(table).select("signature").eq("id", id).maybeSingle();
      const secret = Deno.env.get(keyEnvName(rpc.key_id));
      if (secret && row?.signature) {
        const expected = await hmacSha256Hex(secret, rpc.record_hash);
        signature_ok = expected === row.signature;
      }
    }

    // Log verification (best-effort)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await supabase.from("integrity_verification_log").insert({
      verifier_id: verifierId,
      verifier_type: verifierType,
      table_name: table,
      record_id: id,
      patient_id: patientId,
      status: (rpc as any)?.status ?? "unknown",
      payload_ok: (rpc as any)?.payload_ok ?? null,
      chain_ok: (rpc as any)?.chain_ok ?? null,
      signature_ok,
      has_signature: (rpc as any)?.has_signature ?? null,
      key_id: (rpc as any)?.key_id ?? null,
      algorithm_version: ALGORITHM_VERSION,
      share_token: shareTokenId,
      ip,
      user_agent: ua,
    });

    return new Response(JSON.stringify({ ...rpc, signature_ok, algorithm_version: ALGORITHM_VERSION }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
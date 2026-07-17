import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TABLES = new Set(["medical_records", "recetas", "estudios_solicitados"]);

function keyEnvName(keyId: string) {
  return `INTEGRITY_KEY_${keyId.replace(/-/g, "_")}`;
}

async function sha256Hex(message: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function canonical(row: Record<string, unknown>): string {
  const excluded = new Set(["updated_at", "signature", "record_hash", "prev_hash", "payload_hash", "key_id", "signed_at"]);
  const clean: Record<string, unknown> = {};
  for (const k of Object.keys(row)) if (!excluded.has(k)) clean[k] = row[k];
  const keys = Object.keys(clean).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${JSON.stringify(clean[k])}`);
  return `{${parts.join(",")}}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { table, id } = await req.json();
    if (!ALLOWED_TABLES.has(table) || !id) {
      return new Response(JSON.stringify({ valid: false, error: "invalid_params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
    if (error || !row) {
      return new Response(JSON.stringify({ valid: false, error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!row.record_hash) {
      return new Response(JSON.stringify({ valid: false, error: "no_hash", status: "unsigned" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payloadHash = await sha256Hex(canonical(row));
    // El trigger usa to_char(..., 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') sobre signed_at en UTC
    const raw = row.signed_at as string;
    const signedAtFmt = raw.replace("+00:00", "Z").replace(/(\.\d{1,5})Z$/, (_m, p1) => p1.padEnd(7, "0") + "Z");
    const candidates = [signedAtFmt, raw];
    let recordHash: string | null = null;
    for (const s of candidates) {
      const h = await sha256Hex(row.prev_hash + payloadHash + row.key_id + s);
      if (h === row.record_hash) { recordHash = h; break; }
    }
    const payloadOk = payloadHash === row.payload_hash;
    const chainOk = recordHash !== null;

    let signatureOk: boolean | null = null;
    if (row.signature) {
      const secret = Deno.env.get(keyEnvName(row.key_id));
      if (secret) {
        const expected = await hmacSha256Hex(secret, row.record_hash);
        signatureOk = expected === row.signature;
      }
    }

    const valid = payloadOk && chainOk && (signatureOk === null || signatureOk === true);
    return new Response(JSON.stringify({
      valid,
      payload_ok: payloadOk,
      chain_ok: chainOk,
      signature_ok: signatureOk,
      status: !row.signature ? "pending_signature" : valid ? "verified" : "broken",
      key_id: row.key_id,
      signed_at: row.signed_at,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
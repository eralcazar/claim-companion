import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { table, id } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rpc, error } = await supabase.rpc("verify_record_hash", { _table: table, _id: id });
    if (error) {
      return new Response(JSON.stringify({ valid: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verificar firma HMAC si existe
    let signature_ok: boolean | null = null;
    if (rpc?.has_signature && rpc?.key_id && rpc?.record_hash) {
      const { data: row } = await supabase.from(table).select("signature").eq("id", id).maybeSingle();
      const secret = Deno.env.get(keyEnvName(rpc.key_id));
      if (secret && row?.signature) {
        const expected = await hmacSha256Hex(secret, rpc.record_hash);
        signature_ok = expected === row.signature;
      }
    }

    return new Response(JSON.stringify({ ...rpc, signature_ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ valid: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
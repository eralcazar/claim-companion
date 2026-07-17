import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = ["medical_records", "recetas", "estudios_solicitados"] as const;

function keyEnvName(keyId: string) {
  return `INTEGRITY_KEY_${keyId.replace(/-/g, "_")}`;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: Record<string, number> = {};
  const keyCache = new Map<string, string | undefined>();

  for (const table of TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select("id, record_hash, key_id, signature")
      .is("signature", null)
      .not("record_hash", "is", null)
      .limit(200);

    if (error) {
      results[table] = -1;
      continue;
    }

    let signed = 0;
    for (const row of data ?? []) {
      let secret = keyCache.get(row.key_id);
      if (secret === undefined) {
        secret = Deno.env.get(keyEnvName(row.key_id));
        keyCache.set(row.key_id, secret);
      }
      if (!secret) continue;
      const signature = await hmacSha256Hex(secret, row.record_hash);
      const { error: upErr } = await supabase
        .from(table)
        .update({ signature })
        .eq("id", row.id);
      if (!upErr) signed++;
    }
    results[table] = signed;
  }

  return new Response(JSON.stringify({ ok: true, signed: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
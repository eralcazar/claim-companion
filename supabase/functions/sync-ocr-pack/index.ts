import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roleRow?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const { pack_id, environment } = await req.json();
    if (!pack_id) throw new Error("pack_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: pack, error: pErr } = await admin
      .from("ocr_packs")
      .select("*")
      .eq("id", pack_id)
      .maybeSingle();
    if (pErr || !pack) throw new Error("Paquete no encontrado");

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);
    const currency = (pack.moneda || "mxn").toLowerCase();

    let productId = pack.stripe_product_id;
    if (!productId) {
      const created = await stripe.products.create({
        name: pack.nombre,
        description: pack.descripcion || `Paquete de ${pack.cantidad_escaneos} escaneos OCR adicionales`,
        metadata: {
          pack_id: pack.id,
          lovable_external_id: pack.id,
          kind: "ocr_pack",
          cantidad_escaneos: String(pack.cantidad_escaneos),
        },
      });
      productId = created.id;
    } else {
      await stripe.products.update(productId, {
        name: pack.nombre,
        description: pack.descripcion || undefined,
      });
    }

    let priceId = pack.stripe_price_id;
    let recreatePrice = true;
    if (priceId) {
      try {
        const existing = await stripe.prices.retrieve(priceId);
        if (
          existing.unit_amount === pack.precio_centavos &&
          existing.currency === currency &&
          !existing.recurring &&
          existing.active
        ) {
          recreatePrice = false;
        } else {
          await stripe.prices.update(priceId, { active: false });
        }
      } catch {
        // ignore
      }
    }
    if (recreatePrice) {
      const created = await stripe.prices.create({
        product: productId,
        unit_amount: pack.precio_centavos,
        currency,
      });
      priceId = created.id;
    }

    await admin
      .from("ocr_packs")
      .update({ stripe_product_id: productId, stripe_price_id: priceId })
      .eq("id", pack.id);

    return new Response(
      JSON.stringify({ ok: true, stripe_product_id: productId, stripe_price_id: priceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("sync-ocr-pack error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
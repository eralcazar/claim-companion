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
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // role check
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "farmacia"]);
    if (!roleRow || roleRow.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { catalog_id, environment } = await req.json();
    if (!catalog_id) throw new Error("catalog_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: row, error: rowErr } = await admin
      .from("pharmacy_catalog")
      .select("*")
      .eq("id", catalog_id)
      .maybeSingle();
    if (rowErr || !row) throw new Error("Producto no encontrado");

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    let productId = row.stripe_product_id;
    if (!productId) {
      const created = await stripe.products.create({
        name: row.nombre + (row.presentacion ? ` (${row.presentacion})` : ""),
        description: row.descripcion || row.descripcion_larga || undefined,
        metadata: { catalog_id: row.id, lovable_external_id: row.id },
      });
      productId = created.id;
    } else {
      await stripe.products.update(productId, {
        name: row.nombre + (row.presentacion ? ` (${row.presentacion})` : ""),
        description: row.descripcion || row.descripcion_larga || undefined,
      });
    }

    // Compare current price; if mismatch, archive old and create new
    let priceId = row.stripe_price_id;
    let needNew = !priceId;
    if (priceId) {
      const existingPrice = await stripe.prices.retrieve(priceId);
      if (
        existingPrice.unit_amount !== row.precio_centavos ||
        existingPrice.currency !== (row.moneda || "mxn").toLowerCase()
      ) {
        await stripe.prices.update(priceId, { active: false });
        needNew = true;
      }
    }
    if (needNew) {
      const newPrice = await stripe.prices.create({
        product: productId,
        unit_amount: row.precio_centavos,
        currency: (row.moneda || "mxn").toLowerCase(),
      });
      priceId = newPrice.id;
    }

    await admin
      .from("pharmacy_catalog")
      .update({ stripe_product_id: productId, stripe_price_id: priceId })
      .eq("id", row.id);

    return new Response(
      JSON.stringify({ ok: true, stripe_product_id: productId, stripe_price_id: priceId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("sync-catalog-product error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
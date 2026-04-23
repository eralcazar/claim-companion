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

    const { pack_id, environment, returnUrl } = await req.json();
    if (!pack_id) throw new Error("pack_id requerido");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: pack } = await admin
      .from("ocr_packs")
      .select("*")
      .eq("id", pack_id)
      .eq("activo", true)
      .maybeSingle();
    if (!pack) throw new Error("Paquete no disponible");
    if (!pack.stripe_price_id) throw new Error("Paquete no sincronizado con cobros. Pedile al admin que lo publique.");

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // Create the purchase row first (pending) so the webhook can mark it paid
    const { data: purchase, error: pErr } = await admin
      .from("ocr_pack_purchases")
      .insert({
        user_id: user.id,
        pack_id: pack.id,
        cantidad_escaneos: pack.cantidad_escaneos,
        precio_centavos: pack.precio_centavos,
        moneda: pack.moneda,
        status: "pending",
        environment: env,
      })
      .select()
      .single();
    if (pErr) throw pErr;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      line_items: [{ price: pack.stripe_price_id, quantity: 1 }],
      ...(user.email ? { customer_email: user.email } : {}),
      metadata: {
        userId: user.id,
        kind: "ocr_pack",
        pack_id: pack.id,
        purchase_id: purchase.id,
        cantidad_escaneos: String(pack.cantidad_escaneos),
      },
      return_url:
        returnUrl ||
        `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=ocr_pack`,
    });

    await admin
      .from("ocr_pack_purchases")
      .update({ stripe_session_id: session.id })
      .eq("id", purchase.id);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ocr-pack-checkout error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
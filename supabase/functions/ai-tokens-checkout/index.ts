import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Sesión inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pack_id, environment, returnUrl } = await req.json();
    if (!pack_id) throw new Error("pack_id requerido");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: pack } = await admin
      .from("ai_token_packs")
      .select("*")
      .eq("id", pack_id)
      .eq("activo", true)
      .maybeSingle();
    if (!pack) throw new Error("Paquete no disponible");
    if (!pack.stripe_price_id) throw new Error("Paquete no sincronizado con cobros");

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const { data: purchase, error: pErr } = await admin
      .from("ai_token_purchases")
      .insert({
        user_id: user.id,
        pack_id: pack.id,
        tokens: pack.tokens,
        amount_cents: pack.precio_centavos,
        currency: pack.moneda,
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
        kind: "ai_tokens",
        pack_id: pack.id,
        purchase_id: purchase.id,
        tokens: String(pack.tokens),
      },
      return_url:
        returnUrl ||
        `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=ai_tokens`,
    });

    await admin
      .from("ai_token_purchases")
      .update({ stripe_session_id: session.id })
      .eq("id", purchase.id);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-tokens-checkout error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
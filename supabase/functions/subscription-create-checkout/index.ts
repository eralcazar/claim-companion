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

    const { plan_id, billing, environment, returnUrl } = await req.json();
    if (!plan_id || !["mensual", "anual"].includes(billing)) {
      throw new Error("plan_id y billing (mensual|anual) requeridos");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: plan } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("activo", true)
      .maybeSingle();
    if (!plan) throw new Error("Plan no disponible");

    const priceId = billing === "mensual" ? plan.stripe_price_id_mensual : plan.stripe_price_id_anual;
    if (!priceId) throw new Error("Plan no sincronizado con cobros. Publicá primero.");

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    // Reuse customer if we have one
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded",
      line_items: [{ price: priceId, quantity: 1 }],
      ...(existingSub?.stripe_customer_id
        ? { customer: existingSub.stripe_customer_id }
        : user.email
          ? { customer_email: user.email }
          : {}),
      subscription_data: {
        metadata: {
          userId: user.id,
          plan_id,
          kind: "platform_subscription",
        },
      },
      metadata: {
        userId: user.id,
        plan_id,
        kind: "platform_subscription",
      },
      return_url:
        returnUrl ||
        `${req.headers.get("origin")}/checkout/return?session_id={CHECKOUT_SESSION_ID}&kind=subscription`,
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("subscription-create-checkout error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
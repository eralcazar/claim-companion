import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing auth" }, 401);
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { plan_id, billing, environment, returnUrl } = await req.json();
    if (!plan_id || !["mensual", "anual"].includes(billing)) {
      return jsonResponse({ error: "plan_id y billing (mensual|anual) requeridos" }, 400);
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
    if (!plan) return jsonResponse({ error: "Plan no disponible" }, 404);

    const priceId = billing === "mensual" ? plan.stripe_price_id_mensual : plan.stripe_price_id_anual;
    if (!priceId) {
      return jsonResponse(
        { error: "Este plan todavía no está sincronizado con cobros. Publicalo desde Admin > Planes." },
        409,
      );
    }

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

    return jsonResponse({ clientSecret: session.client_secret });
  } catch (e: any) {
    console.error("subscription-create-checkout error", e);
    return jsonResponse({ error: e.message }, 500);
  }
});